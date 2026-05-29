import { Frame } from "SpectaclesUIKit.lspkg/Scripts/Components/Frame/Frame"
import { PointManager } from "Scripts/PointManager"
import { ResizableFrame } from "Scripts/ResizeFrame"
import { WidgetController } from "Scripts/WidgetController"

@component
export class HudCreation extends BaseScriptComponent {

	@input
	pointScript: PointManager

	@input
	widget: WidgetController

	@input
	leftFrame: Frame

	@input
	rightFrame: Frame

	@input
	topFrame: Frame

	@input
	leftResize: ResizableFrame

	@input
	rightResize: ResizableFrame

	@input
	topResize: ResizableFrame

	// Ratios (relative to measurement TOTAL size)
	@input
	sideWidthRatio: number = 0.5

	@input
	sideHeightRatio: number = 1.0

	@input
	topWidthRatio: number = 1.0

	@input
	topHeightRatio: number = 0.5

	// Gaps between measurement frame and HUD panels (anchor-local units)
	@input
	gapX: number = 0.0

	@input
	gapY: number = 0.0

	@input
	depthOffset: number = 0.0

	onAwake() {
		this.createEvent("OnStartEvent").bind(() => this.onStart())
	}

	private onStart() {
		this.disableFrames()
	}

	/** msSize = measurement TOTAL size, msPos = measurement CENTER (both anchor-local) */
	public createHud(msSize: vec2, msPos: vec3): void {
		this.enableFrames()

		// Step 1: size + place panels on next tick
		const d = this.createEvent("DelayedCallbackEvent")
		d.bind(() => {
			const leftTotal = new vec2(msSize.x * this.sideWidthRatio, msSize.y * this.sideHeightRatio)
			const rightTotal = new vec2(msSize.x * this.sideWidthRatio, msSize.y * this.sideHeightRatio)
			const topTotal = new vec2(msSize.x * this.topWidthRatio, msSize.y * this.topHeightRatio)

			this.leftFrame.innerSize = this.totalToInner(this.leftFrame, leftTotal)
			this.rightFrame.innerSize = this.totalToInner(this.rightFrame, rightTotal)
			this.topFrame.innerSize = this.totalToInner(this.topFrame, topTotal)

			const msW = msSize.x
			const msH = msSize.y

			const leftW = this.leftFrame.totalSize.x
			const rightW = this.rightFrame.totalSize.x
			const topH = this.topFrame.totalSize.y

			const msLeftEdge = msPos.x - (msW * 0.5)
			const msRightEdge = msPos.x + (msW * 0.5)
			const msTopEdge = msPos.y + (msH * 0.5)

			const leftCenterX = (msLeftEdge - this.gapX) - (leftW * 0.5)
			const rightCenterX = (msRightEdge + this.gapX) + (rightW * 0.5)
			const topCenterY = (msTopEdge + this.gapY) + (topH * 0.5)

			this.leftFrame.getTransform().setLocalPosition(
				new vec3(leftCenterX, msPos.y, msPos.z + this.depthOffset)
			)

			this.rightFrame.getTransform().setLocalPosition(
				new vec3(rightCenterX, msPos.y, msPos.z + this.depthOffset)
			)

			this.topFrame.getTransform().setLocalPosition(
				new vec3(msPos.x, topCenterY, msPos.z + this.depthOffset)
			)

			// Step 2: after placement settles, force each resize script to snap itself
			const d2 = this.createEvent("DelayedCallbackEvent")
			d2.bind(() => {
				if (this.leftResize) this.leftResize.forceRefresh()
				if (this.rightResize) this.rightResize.forceRefresh()
				if (this.topResize) this.topResize.forceRefresh()
			})
			d2.reset(0)
		})
		d.reset(0)
		this.widget.createEditFrame()
	}

	private totalToInner(f: Frame, targetTotal: vec2): vec2 {
		const extra = this.getFrameExtra(f)
		return new vec2(
			Math.max(0.01, targetTotal.x - extra.x),
			Math.max(0.01, targetTotal.y - extra.y)
		)
	}

	private getFrameExtra(f: Frame): vec2 {
		const inner = f.innerSize
		const total = f.totalSize
		return new vec2(total.x - inner.x, total.y - inner.y)
	}

	private disableFrames() {
		this.leftFrame.getSceneObject().enabled = false
		this.rightFrame.getSceneObject().enabled = false
		this.topFrame.getSceneObject().enabled = false
	}

	private enableFrames() {
		this.leftFrame.getSceneObject().enabled = true
		this.rightFrame.getSceneObject().enabled = true
		this.topFrame.getSceneObject().enabled = true

		this.leftFrame.enabled = true
		this.rightFrame.enabled = true
		this.topFrame.enabled = true
	}

}