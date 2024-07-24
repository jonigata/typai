export class TypaiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TypaiError';
  }
}

export class UnexpectedResponseError extends TypaiError {
  constructor(public finishReason: string) {
    super(`Unexpected response: finish_reason was "${finishReason}" instead of "tool_calls"`);
    this.name = 'UnexpectedResponseError';
  }
}

export class AINotFollowingInstructionsError extends TypaiError {
  constructor(public aiResponse: string) {
    super("AI did not follow instructions to use a tool");
    this.name = 'AINotFollowingInstructionsError';
  }
}
