const test = require("node:test");
const assert = require("node:assert/strict");

const instance = require("../.test-dist/quiz-instance.cjs");

test("creates distinct radio group names for quiz instances on the same question", () => {
  const firstQuiz = instance.createQuizInstanceId();
  const secondQuiz = instance.createQuizInstanceId();

  assert.notEqual(firstQuiz, secondQuiz);
  assert.notEqual(
    instance.createChoiceInputName(firstQuiz, 0),
    instance.createChoiceInputName(secondQuiz, 0),
  );
});

test("keeps one radio group stable within a quiz question", () => {
  const quiz = instance.createQuizInstanceId();

  assert.equal(instance.createChoiceInputName(quiz, 2), instance.createChoiceInputName(quiz, 2));
  assert.notEqual(instance.createChoiceInputName(quiz, 1), instance.createChoiceInputName(quiz, 2));
});
