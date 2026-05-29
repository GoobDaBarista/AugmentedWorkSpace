
import { GPTWidget } from "Scripts/GPTWidget"
import { RoundButton} from "SpectaclesUIKit.lspkg/Scripts/Components/Button/RoundButton"
import { ResizableFrame } from "Scripts/ResizeFrame"

@component
export class WidgetController extends BaseScriptComponent {

    @input
    frames: ResizableFrame[]

    // Widgets

    @input
    aiSearch: GPTWidget

    @input
    aiLayout: SceneObject

    // Buttons

    @input
    editButton: RoundButton


    onAwake() {
       this.createEvent("OnStartEvent").bind(() => this.onStart())
    }

    onStart(){
        
    }

    public createEditFrame(){
        this.editButton.setIsToggleable(true)
        this.editButton.onTriggerUp.add(() => {

            const enabled = this.editButton.isOn
            
                this.frames[1].setEdges(["bottom","left","right","top"], enabled)
                this.frames[2].setEdges(["bottom","left","right","top"], enabled)
        })
        
    }

    private createAI(which: SceneObject): void {
        this.aiLayout.setParent(which)
    }
}
