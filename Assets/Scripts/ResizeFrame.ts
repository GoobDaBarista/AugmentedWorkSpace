import { Interactable } from "SpectaclesInteractionKit.lspkg/Components/Interaction/Interactable/Interactable"
import { InteractorEvent } from "SpectaclesInteractionKit.lspkg/Core/Interactor/InteractorEvent"
import { Frame } from "SpectaclesUIKit.lspkg/Scripts/Components/Frame/Frame"

type AxisKind = "H" | "V"
type EdgeKind = "top" | "bottom" | "left" | "right"

@component
export class ResizableFrame extends BaseScriptComponent {
	@input
	frameVisual: Frame

	// Interactables (one per handle)
	@input
	topInter: Interactable

	@input
	bottomInter: Interactable

	@input
	leftInter: Interactable

	@input
	rightInter: Interactable

	// Handle visuals
	@input
	topHandle: SceneObject

	@input
	bottomHandle: SceneObject

	@input
	leftHandle: SceneObject

	@input
	rightHandle: SceneObject

	// Constraints / tuning
	@input
	minWidth: number = 1

	@input
	minHeight: number = 1

	@input
	edgeOffset: number = 0.0

	@input
	sensitivityX: number = 1.0

	@input
	sensitivityY: number = 1.0

	// Enable/disable edges
	@input
	enableTop: boolean = true

	@input
	enableBottom: boolean = true

	@input
	enableLeft: boolean = true

	@input
	enableRight: boolean = true

	@input
	hideDisabledHandles: boolean = true

	@input
	disableDisabledInteractables: boolean = true

	// Optional background visual
	@input
	backgroundMesh: SceneObject

	// Border visuals
	@input
	borderTop: SceneObject

	@input
	borderBottom: SceneObject

	@input
	borderLeft: SceneObject

	@input
	borderRight: SceneObject

	@input
	borderThickness: number = 0.08

	@input
	borderInset: number = 0.0

	@input
	zBg: number = -0.010

	@input
	zBorder: number = -0.002

	@input
	handleInset: number = 1.0

	// Drag state
	private dragging: boolean = false
	private activeEdge: EdgeKind | null = null
	private dragAxisKind: AxisKind = "V"

	private anchorWorldFixed: vec3 = new vec3(0, 0, 0)
	private axisWorld: vec3 = new vec3(0, 1, 0)
	private startSize: vec2 = new vec2(0, 0)
	private startHandAlongAxis: number = 0

	// Defaults captured on start
	private defaultInnerSize: vec2 = new vec2(0, 0)
	private defaultWorldPos: vec3 = new vec3(0, 0, 0)
	private defaultWorldRot: quat = null
	private defaultCaptured: boolean = false

	onAwake() {
		this.createEvent("OnStartEvent").bind(() => this.onStart())
	}

	private onStart() {
		this.applyEdgeToggles()

		const d = this.createEvent("DelayedCallbackEvent")
		d.bind(() => {
			this.captureDefaultsOnce()
			this.refreshAll()
		})
		d.reset(0)

		const fvAny = this.frameVisual as any
		if (fvAny && fvAny.onInitialized && fvAny.onInitialized.add) {
			fvAny.onInitialized.add(() => {
				this.applyEdgeToggles()
				this.captureDefaultsOnce()
				this.refreshAll()
			})
		}

		this.bindEdge(this.topInter, "top")
		this.bindEdge(this.bottomInter, "bottom")
		this.bindEdge(this.leftInter, "left")
		this.bindEdge(this.rightInter, "right")
	}

	public refreshAll() {
		this.snapHandlesWorld()
		this.syncHudVisualsWorld()
	}

	private isEdgeEnabled(which: EdgeKind): boolean {
		if (which === "top") return this.enableTop
		if (which === "bottom") return this.enableBottom
		if (which === "left") return this.enableLeft
		return this.enableRight
	}

	private applyEdgeToggles(): void {
		if (this.hideDisabledHandles) {
			if (this.topHandle) this.topHandle.enabled = this.enableTop
			if (this.bottomHandle) this.bottomHandle.enabled = this.enableBottom
			if (this.leftHandle) this.leftHandle.enabled = this.enableLeft
			if (this.rightHandle) this.rightHandle.enabled = this.enableRight
		}

		if (this.disableDisabledInteractables) {
			if (this.topInter) this.topInter.enabled = this.enableTop
			if (this.bottomInter) this.bottomInter.enabled = this.enableBottom
			if (this.leftInter) this.leftInter.enabled = this.enableLeft
			if (this.rightInter) this.rightInter.enabled = this.enableRight
		}
	}

	private bindEdge(inter: Interactable, which: EdgeKind) {
		if (!inter) {
			print("Missing Interactable for " + which)
			return
		}

		inter.onTriggerStart.add((event: InteractorEvent) => {
			this.dragging = true
			this.activeEdge = which

			const fvT = this.frameVisual.getTransform()
			const world = fvT.getWorldTransform()
			const total = this.frameVisual.totalSize

			this.startSize = this.frameVisual.innerSize

			const upWorld = fvT.getWorldRotation().multiplyVec3(new vec3(0, 1, 0)).normalize()
			const rightWorld = fvT.getWorldRotation().multiplyVec3(new vec3(1, 0, 0)).normalize()

			if (which === "top") {
				this.dragAxisKind = "V"
				this.axisWorld = upWorld
				const halfH = total.y * 0.5
				this.anchorWorldFixed = world.multiplyPoint(new vec3(0, -halfH, 0))
			} else if (which === "bottom") {
				this.dragAxisKind = "V"
				this.axisWorld = upWorld.uniformScale(-1)
				const halfH = total.y * 0.5
				this.anchorWorldFixed = world.multiplyPoint(new vec3(0, +halfH, 0))
			} else if (which === "right") {
				this.dragAxisKind = "H"
				this.axisWorld = rightWorld
				const halfW = total.x * 0.5
				this.anchorWorldFixed = world.multiplyPoint(new vec3(-halfW, 0, 0))
			} else {
				this.dragAxisKind = "H"
				this.axisWorld = rightWorld.uniformScale(-1)
				const halfW = total.x * 0.5
				this.anchorWorldFixed = world.multiplyPoint(new vec3(+halfW, 0, 0))
			}

			const handWorld = event.interactor.planecastPoint
			this.startHandAlongAxis = handWorld.sub(this.anchorWorldFixed).dot(this.axisWorld)
		})

		inter.onTriggerEnd.add(() => {
			if (this.activeEdge === which) {
				this.dragging = false
				this.activeEdge = null
			}
		})

		inter.onTriggerUpdate.add((event: InteractorEvent) => {
			if (!this.dragging || this.activeEdge !== which) return

			const fvT = this.frameVisual.getTransform()
			const handWorld = event.interactor.planecastPoint

			const alongNow = handWorld.sub(this.anchorWorldFixed).dot(this.axisWorld)
			let delta = alongNow - this.startHandAlongAxis

			if (this.dragAxisKind === "H") delta *= this.sensitivityX
			else delta *= this.sensitivityY

			let newW = this.startSize.x
			let newH = this.startSize.y

			if (this.dragAxisKind === "V") {
				newH = Math.max(this.minHeight, this.startSize.y + delta)
			} else {
				newW = Math.max(this.minWidth, this.startSize.x + delta)
			}

			this.frameVisual.innerSize = new vec2(newW, newH)

			const total = this.frameVisual.totalSize
			const halfAlong = (this.dragAxisKind === "V" ? total.y : total.x) * 0.5
			const centerWorld = this.anchorWorldFixed.add(this.axisWorld.uniformScale(halfAlong))
			fvT.setWorldPosition(centerWorld)

			this.refreshAll()
		})
	}

	private snapHandlesWorld() {
		const fvT = this.frameVisual.getTransform()
		const total = this.frameVisual.totalSize
		const world = fvT.getWorldTransform()

		const halfW = total.x * 0.5 - this.handleInset
		const halfH = total.y * 0.5 - this.handleInset

		if (this.enableTop && this.topHandle) {
			const up = world.multiplyPoint(new vec3(0, +halfH + this.edgeOffset, 0))
			this.topHandle.getTransform().setWorldPosition(up)
			this.setHandleScale(this.topHandle, true, halfW)
		}

		if (this.enableBottom && this.bottomHandle) {
			const down = world.multiplyPoint(new vec3(0, -halfH - this.edgeOffset, 0))
			this.bottomHandle.getTransform().setWorldPosition(down)
			this.setHandleScale(this.bottomHandle, true, halfW)
		}

		if (this.enableLeft && this.leftHandle) {
			const left = world.multiplyPoint(new vec3(-halfW - this.edgeOffset, 0, 0))
			this.leftHandle.getTransform().setWorldPosition(left)
			this.setHandleScale(this.leftHandle, false, halfH)
		}

		if (this.enableRight && this.rightHandle) {
			const right = world.multiplyPoint(new vec3(+halfW + this.edgeOffset, 0, 0))
			this.rightHandle.getTransform().setWorldPosition(right)
			this.setHandleScale(this.rightHandle, false, halfH)
		}
	}

	private setHandleScale(handle: SceneObject, vertical: boolean, resize: number) {
		const t = handle.getTransform()
		if (vertical) t.setWorldScale(new vec3(resize, 1, 1))
		else t.setWorldScale(new vec3(1, resize, 1))
	}

	private syncHudVisualsWorld(): void {
		const fvT = this.frameVisual.getTransform()
		const world = fvT.getWorldTransform()
		const rot = fvT.getWorldRotation()

		const size = this.frameVisual.totalSize
		const halfW = size.x * 0.5
		const halfH = size.y * 0.5

		const thickness = Math.max(0.001, this.borderThickness)
		const inset = this.borderInset

		const wIn = Math.max(0.01, size.x - inset * 2)
		const hIn = Math.max(0.01, size.y - inset * 2)

		const place = (so: SceneObject | null, posLocal: vec3, scaleWorld: vec3, z: number) => {
			if (!so) return
			const tr = so.getTransform()
			tr.setWorldRotation(rot)
			tr.setWorldPosition(world.multiplyPoint(new vec3(posLocal.x, posLocal.y, z)))
			tr.setWorldScale(scaleWorld)
		}

		if (this.backgroundMesh) {
			place(this.backgroundMesh, new vec3(0, 0, 0), new vec3(size.x, size.y, 1), this.zBg)
		}

		place(this.borderTop, new vec3(0, +halfH - thickness * 0.5 - inset, 0), new vec3(wIn, thickness, 1), this.zBorder)
		place(this.borderBottom, new vec3(0, -halfH + thickness * 0.5 + inset, 0), new vec3(wIn, thickness, 1), this.zBorder)
		place(this.borderLeft, new vec3(-halfW + thickness * 0.5 + inset, 0, 0), new vec3(thickness, hIn, 1), this.zBorder)
		place(this.borderRight, new vec3(+halfW - thickness * 0.5 - inset, 0, 0), new vec3(thickness, hIn, 1), this.zBorder)
	}

	private captureDefaultsOnce() {
		if (this.defaultCaptured) return

		this.defaultInnerSize = this.frameVisual.innerSize

		const t = this.frameVisual.getTransform()
		this.defaultWorldPos = t.getWorldPosition()
		this.defaultWorldRot = t.getWorldRotation()

		this.defaultCaptured = true
	}

	public forceRefresh() {
		this.applyEdgeToggles()

		this.defaultInnerSize = this.frameVisual.innerSize
		const t = this.frameVisual.getTransform()
		this.defaultWorldPos = t.getWorldPosition()
		this.defaultWorldRot = t.getWorldRotation()
		this.defaultCaptured = true

		this.refreshAll()
	}

	public resetToDefault() {
		if (!this.defaultCaptured) this.captureDefaultsOnce()

		this.dragging = false
		this.activeEdge = null

		this.frameVisual.innerSize = new vec2(this.defaultInnerSize.x, this.defaultInnerSize.y)

		const t = this.frameVisual.getTransform()
		t.setWorldPosition(this.defaultWorldPos)
		t.setWorldRotation(this.defaultWorldRot)

		this.applyEdgeToggles()
		this.refreshAll()
	}
	public setEdges(edges: EdgeKind[], enabled: boolean): void {

		for (let i = 0; i < edges.length; i++) {
			const edge = edges[i]
			
				if (edge === "top") this.enableTop = enabled
				if (edge === "bottom") this.enableBottom = enabled
				if (edge === "left") this.enableLeft = enabled
				if (edge === "right") this.enableRight = enabled
			
		}

		this.applyEdgeToggles()
		this.refreshAll()
	}
}