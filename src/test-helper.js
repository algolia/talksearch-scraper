import rewire from 'rewire';

function load(modulePath) {
  return rewire(modulePath);
}

function mockPrivate(module, methodName, returnValue = undefined) {
  const mockMethod = jest.fn(() => returnValue);
  module.__set__(methodName, mockMethod);
  return mockMethod;
}

function globalBeforeEach() {
  __rewire_reset_all__();
  // jest.resetAllMocks();
  // jest.restoreAllMocks();
}

export { load, mockPrivate, globalBeforeEach };
export default { load, mockPrivate, globalBeforeEach };
