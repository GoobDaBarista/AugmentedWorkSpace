import { Frame } from "SpectaclesUIKit.lspkg/Scripts/Components/Frame/Frame"
import { RectangleButton } from "SpectaclesUIKit.lspkg/Scripts/Components/Button/RectangleButton"
import { ResizableFrame } from "Scripts/ResizeFrame"
import { HudCreation } from "Scripts/HudCreation"

@component
export class PointManager extends BaseScriptComponent {
	@input
	resizeScript: ResizableFrame

	@input
	hudCreation: HudCreation

	@input
	menuFrame: SceneObject

	@input
	msObj: SceneObject

	@input
	msFrame: Frame

	@input
	worldAnchor: SceneObject

	@input
	resetButton: RectangleButton

	@input
	confirmButton: RectangleButton

	private startFramePos: vec3 = new vec3(0, -1, 4)

	private savedSize: vec2 = new vec2(0, 0)
	private savedPosition: vec3 = new vec3(0, 0, 0)

	private confirmed: boolean = false
	private detached: boolean = false

	onAwake() {
		this.createEvent("OnStartEvent").bind(() => this.onStart())
		this.createEvent("UpdateEvent").bind(() => this.checkMove())
	}

	onStart() {
		this.attach()
		this.initializeButtons()
	}

	private initializeButtons() {
		this.resetButton.onTriggerUp.add(() => {
			this.attach()
		})

		this.confirmButton.onTriggerUp.add(() => {
			this.savePosition()
			this.saveSize()

			this.menuFrame.enabled = false
			this.msObj.enabled = false
			this.confirmed = true

			this.hudCreation.createHud(this.savedSize, this.savedPosition)
		})
	}

	private attach() {
		this.detached = false
		this.confirmed = false

		this.menuFrame.enabled = true
		this.msObj.enabled = true

		this.resizeScript.resetToDefault()

		this.msObj.setParent(this.menuFrame)

		const msTransform = this.msFrame.getTransform()
		msTransform.setLocalPosition(this.startFramePos)
	}

	private detach() {
		if (this.detached) return

		const t = this.msObj.getTransform()
		const wp = t.getWorldPosition()
		const wr = t.getWorldRotation()
		const ws = t.getWorldScale()

		this.msObj.setParent(this.worldAnchor)

		t.setWorldPosition(wp)
		t.setWorldRotation(wr)
		t.setWorldScale(ws)

		this.detached = true
	}

	private checkMove() {
		if (this.detached) return

		const msTransform = this.msObj.getTransform()
		const pos = msTransform.getLocalPosition()

		const delta = pos.sub(this.startFramePos)

		if (delta.length > 0.1) {
			this.detach()
		}
	}

	private savePosition() {
		// Because confirm happens after detach, this is worldAnchor-local
		const msTransform = this.msFrame.getTransform()
		this.savedPosition = msTransform.getLocalPosition()
	}

	private saveSize() {
		this.savedSize = this.msFrame.totalSize
	}

	public isConfirmed(): boolean {
		return this.confirmed
	}

	public getPos(): vec3 {
		return this.savedPosition
	}

	public getSize(): vec2 {
		return this.savedSize
	}
}