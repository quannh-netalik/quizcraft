let nextInstance = 0;

export function createQuizInstanceId(): string {
  nextInstance += 1;
  return `quiz-${nextInstance}`;
}

export function createChoiceInputName(instanceId: string, questionIndex: number): string {
  return `obquiz-${instanceId}-${questionIndex}`;
}
