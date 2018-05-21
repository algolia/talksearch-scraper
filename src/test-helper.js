function mockPrivate(module, methodName, returnValue = undefined) {
  const mockMethod = jest.fn(() => returnValue);
  module.__RewireAPI__.__Rewire__(methodName, mockMethod);
  return mockMethod;
}

function globalBeforeEach() {
  __rewire_reset_all__();
  jest.resetAllMocks();
  jest.restoreAllMocks();
}

export { mockPrivate, globalBeforeEach };
export default { mockPrivate, globalBeforeEach };
