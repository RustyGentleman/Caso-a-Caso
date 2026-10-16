const CASES = [
	[
		'<b>Introdução:</b> Durante uma fiscalização de trânsito de rotina, seu cliente é abordado e encontrado transportando R$ 300.000 em dinheiro vivo no porta-luvas do veículo.',
		'<b>Round 1:</b> Na abordagem policial, descobre-se que o cliente é servidor público concursado no cargo de fiscal de posturas da Secretaria Municipal de Urbanismo.',
		'<b>Round 2:</b> A pericia nos maços apreendidos identifica que o dinheiro possui cintas bancárias, com carimbos de saque efetuado na véspera, da conta corrente de uma grande construtora privada.',
		'<b>Round 3:</b> Em auditoria no sistema do órgão, identifica-se que, no mesmo dia do saque, o fiscal assinou a liberação de um habite-se para um condomínio da construtora, obra que estava embargada por irregularidades graves.',
		'<b>Round 4:</b> Interceptações telefônicas e imagens de câmeras de segurança de um restaurante revelam que a oferta do dinheiro partiu espontaneamente da construtora para conseguir a licença, e o cliente aceitou receber o envelope de dinheiro.',
	],
]

addEventListener('load', () => {
	const rounds = []
	document.querySelectorAll('.card-slot').forEach(s => {
		s.addEventListener('click', (e) => {
			s.firstElementChild.classList.toggle('down')
		})
	})
	document.addEventListener('keydown', e => {
		if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
			const right = e.key == 'ArrowRight'
			let CASE = +document.body.dataset.case
			let STAGE = +document.body.dataset.stage + (right?1:-1)
			if (!right && STAGE < -1) {
				if (CASE == 0) return;
				CASE--
				STAGE = 4
			}
			if (right && STAGE > 4 && CASE < CASES.length) {
				CASE++
				STAGE = -1
				const down = Array.from(document.querySelectorAll('.card.down'))
				rounds.push({
					stage: STAGE-1,
					slotsDown: down.map((e, i) => `#${i+1} ${e.textContent.trim()}`)
				})
			}
			if (STAGE === -1)
				document.getElementById('stages').innerHTML = ''

			const l = document.createElement('div')
			l.innerHTML = CASES[CASE][STAGE]
			if (l.innerHTML != 'undefined')
				document.getElementById('stages').innerHTML = l.outerHTML

			document.body.dataset.stage = STAGE
			document.body.dataset.case = CASE
		} else if (e.key === 'ArrowUp') {
			document.getElementById('tree-wrapper').classList.toggle('hidden')
		}
	})

	//? Tree connections
	const tree = document.getElementById('tree')
	const canvas = tree.firstElementChild
	const ctx = canvas.getContext('2d')

	const layers = Array.from(tree.querySelectorAll('.layer'))
		.map(layer => Array.from(layer.querySelectorAll('.node')))

	const connections = [
		[0,0,1,0], [0,0,1,1],
		[1,0,2,0], [1,0,2,1], [1,0,2,2], [1,1,2,0], [1,1,2,1], [1,1,2,2],
		[2,0,3,0], [2,0,3,1], [2,0,3,2], [2,1,3,0], [2,1,3,1], [2,1,3,2], [2,2,3,0], [2,2,3,1], [2,2,3,2],
		[3,0,4,0], [3,0,4,1], [3,0,4,2], [3,1,4,0], [3,1,4,1], [3,1,4,2], [3,2,4,0], [3,2,4,1], [3,2,4,2],
		[4,0,5,0],
		[4,1,5,1], [4,1,5,2], [4,1,5,3], [4,1,5,5], [4,1,5,6], [4,1,5,7],
		[4,2,5,2], [4,2,5,4], [4,2,5,7]
	]

	//? Selection state
	const selectedNodes = new Set()

	function nodeId(layer, node) {
		return `${layer},${node}`
	}
	function parseNodeId(id) {
		return id.split(',').map(Number)
	}

	//? Graph helpers
	function getNextNodes(layer, node) {
		return connections
			.filter(([sl, sn]) => sl === layer && sn === node)
			.map(([, , tl, tn]) => [tl, tn])
	}
	function getPreviousNodes(layer, node) {
		return connections
			.filter(([, , tl, tn]) => tl === layer && tn === node)
			.map(([sl, sn]) => [sl, sn])
	}
	function reachableFrom(startNodes) {
		const reachable = new Set(startNodes)

		for (let layer = 0; layer < layers.length - 1; layer++) {
			for (let node = 0; node < layers[layer].length; node++) {
				if (!reachable.has(nodeId(layer, node)))
					continue

				for (const [tl, tn] of getNextNodes(layer, node))
					reachable.add(nodeId(tl, tn))
			}
		}

		return reachable
	}
	function reachableTo(endNodes) {
		const reachable = new Set(endNodes)

		for (let layer = layers.length - 1; layer > 0; layer--) {
			for (let node = 0; node < layers[layer].length; node++) {
				if (!reachable.has(nodeId(layer, node)))
					continue

				for (const [sl, sn] of getPreviousNodes(layer, node))
					reachable.add(nodeId(sl, sn))
			}
		}

		return reachable
	}
	// Calculate valid paths through the selected layers
	function getValidPaths() {
		if (!selectedNodes.size)
			return null

		const selected = [...selectedNodes].map(parseNodeId)
		const selectedLayers = new Map()

		for (const [layer, node] of selected) {
			if (!selectedLayers.has(layer))
				selectedLayers.set(layer, new Set())

			selectedLayers.get(layer).add(node)
		}

		const topLayer = Math.min(...selected.map(([layer]) => layer))
		const bottomLayer = Math.max(...selected.map(([layer]) => layer))

		// Selected layers can only be traversed through selected nodes.
		function isAllowed(layer, node) {
			const allowed = selectedLayers.get(layer)
			return !allowed || allowed.has(node)
		}

		// Forward reachability, respecting selected-layer constraints.
		const forward = new Set()

		for (let node = 0; node < layers[0].length; node++) {
			if (isAllowed(0, node))
				forward.add(nodeId(0, node))
		}

		for (let layer = 0; layer < bottomLayer; layer++) {
			for (let node = 0; node < layers[layer].length; node++) {
				if (!forward.has(nodeId(layer, node)))
					continue

				for (const [tl, tn] of getNextNodes(layer, node)) {
					if (isAllowed(tl, tn))
						forward.add(nodeId(tl, tn))
				}
			}
		}

		// Backward reachability, starting from the bottommost selections.
		const bottomSelections = [...selectedNodes]
			.filter(id => parseNodeId(id)[0] === bottomLayer)

		const backward = reachableTo(bottomSelections)

		// Keep only nodes that belong to a valid path through all selections.
		const validNodes = new Set(
			[...forward].filter(id => backward.has(id))
		)

		const validEdges = new Set()

		for (const [sl, sn, tl, tn] of connections) {
			if (tl > bottomLayer)
				continue

			const sourceId = nodeId(sl, sn)
			const targetId = nodeId(tl, tn)

			if (validNodes.has(sourceId) && validNodes.has(targetId))
				validEdges.add(`${sl},${sn},${tl},${tn}`)
		}

		// All nodes reachable after the bottommost selection remain available.
		const downstream = reachableFrom(bottomSelections)

		return {
			topLayer,
			bottomLayer,
			validNodes,
			validEdges,
			downstream
		}
	}
	// Update node classes and redraw connections
	function updateVisualization() {
		const paths = getValidPaths()

		for (let layer = 0; layer < layers.length; layer++) {
			for (let node = 0; node < layers[layer].length; node++) {
				const element = layers[layer][node]
				const id = nodeId(layer, node)

				element.classList.toggle('selected', selectedNodes.has(id))

				let greyedOut = false

				if (paths) {
					if (layer <= paths.bottomLayer)
						greyedOut = !paths.validNodes.has(id)
					else
						greyedOut = !paths.downstream.has(id)
				}

				element.classList.toggle(
					'greyed',
					greyedOut && !selectedNodes.has(id)
				)
			}
		}

		drawConnections(paths)
	}

	// Node selection
	for (let layer = 0; layer < layers.length; layer++) {
		for (let node = 0; node < layers[layer].length; node++) {
			layers[layer][node].addEventListener('click', () => {
				const id = nodeId(layer, node)

				if (selectedNodes.has(id))
					selectedNodes.delete(id)
				else
					selectedNodes.add(id)

				updateVisualization()

				if (document.querySelectorAll('.node[data-tag].greyed').length === 0)
					document.querySelectorAll('.card').forEach(e => e.classList.remove('down'))

				const invalid = []
				for (const node of document.querySelectorAll('.node[data-tag].greyed'))
					invalid.push(node.dataset.tag)
				for (const card of document.querySelectorAll('.card-slot'))
					for (const tag of invalid) {
						if (card.dataset.tags.includes(tag)) {
							card.firstElementChild.classList.add('down')
							break
						}
						card.firstElementChild.classList.remove('down')
					}
			})
		}
	}

	// Draw arrows
	function drawArrow(origin, target, style = 'normal') {
		const treeR = tree.getBoundingClientRect()
		const oR = origin.getBoundingClientRect()
		const tR = target.getBoundingClientRect()

		const x1 = oR.left + oR.width / 2 - treeR.left
		const y1 = oR.bottom - treeR.top
		const x2 = tR.left + tR.width / 2 - treeR.left
		const y2 = tR.top - treeR.top

		const colors = {
			normal: 'white',
			highlight: '#ffc400',
			grey: '#333'
		}

		ctx.strokeStyle = colors[style]
		ctx.fillStyle = colors[style]
		ctx.lineWidth = 3
		ctx.lineCap = 'round'
		ctx.lineJoin = 'round'

		// Connection
		ctx.beginPath()
		ctx.moveTo(x1, y1)
		ctx.lineTo(x2, y2)
		ctx.stroke()

		// Arrowhead
		const angle = Math.atan2(y2 - y1, x2 - x1)
		const headLength = 8
		const headAngle = Math.PI / 6

		ctx.beginPath()
		ctx.moveTo(x2, y2)
		ctx.lineTo(
			x2 - headLength * Math.cos(angle - headAngle),
			y2 - headLength * Math.sin(angle - headAngle)
		)
		ctx.lineTo(
			x2 - headLength * Math.cos(angle + headAngle),
			y2 - headLength * Math.sin(angle + headAngle)
		)
		ctx.closePath()
		ctx.fill()
	}
	// Draw connections
	function drawConnections(paths = getValidPaths()) {
		const rect = tree.getBoundingClientRect()
		const dpr = window.devicePixelRatio || 1

		canvas.width = Math.round(rect.width * dpr)
		canvas.height = Math.round(rect.height * dpr)
		canvas.style.width = `${rect.width}px`
		canvas.style.height = `${rect.height}px`

		ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
		ctx.clearRect(0, 0, rect.width, rect.height)

		for (const [sl, sn, tl, tn] of connections) {
			const source = layers[sl]?.[sn]
			const target = layers[tl]?.[tn]

			if (!source || !target)
				continue

			let style = 'normal'

			if (paths) {
				const edgeId = `${sl},${sn},${tl},${tn}`

				if (tl <= paths.bottomLayer) {
					style = paths.validEdges.has(edgeId)
						? 'highlight'
						: 'grey'
				} else {
					const sourceReachable = paths.downstream.has(nodeId(sl, sn))
					const targetReachable = paths.downstream.has(nodeId(tl, tn))

					if (!sourceReachable || !targetReachable)
						style = 'grey'
				}
			}

			drawArrow(source, target, style)
		}
	}

	// Resize handling
	const resizeObserver = new ResizeObserver(() => { drawConnections() })
	resizeObserver.observe(tree)
	for (const layer of layers)
		for (const node of layer)
			resizeObserver.observe(node)
	window.addEventListener('resize', () => drawConnections())

	// Initial render
	updateVisualization()
})