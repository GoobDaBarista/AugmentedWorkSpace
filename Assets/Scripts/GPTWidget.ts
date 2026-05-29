@component
export class GPTWidget extends BaseScriptComponent {
	@input
	question: string = "What are some ideas for Lenses?"

	@input
	outputDisplay: Text

	private request: any

	onAwake() {
    this.createEvent("OnStartEvent").bind(() => this.onStart())
	}
  
  onStart(){
    this.outputDisplay.enabled = false
    this.request = {
			temperature: 0,
			messages: [{ role: "user", content: this.question }],
		}

		const tap = this.createEvent("TapEvent")
		tap.bind(() => this.sendPrompt())

		print("Tap to call GPT!")
  }

	public sendPrompt(prompt?: string): void {
		const finalPrompt = prompt ? prompt : this.question

		this.request.messages[0].content = finalPrompt

		print("Requesting answer for: " + finalPrompt)

		const chatGpt = (global as any).chatGpt
		if (!chatGpt || !chatGpt.completions) {
			print("global.chatGpt.completions is not available. Check that the ChatGPT/Remote API is configured.")
			return
		}

		chatGpt.completions(this.request, (errorStatus: any, response: any) => {
			if (!errorStatus && response && typeof response === "object") {
				const mainAnswer = response?.choices?.[0]?.message?.content

				if (mainAnswer != null) {
					print(mainAnswer)

					if (this.outputDisplay) {
						this.outputDisplay.text = mainAnswer
					}
				} else {
					print("No answer found in response: " + JSON.stringify(response))
				}
			} else {
				print("Error or unexpected response: " + JSON.stringify(response))
			}
		})
	}
}