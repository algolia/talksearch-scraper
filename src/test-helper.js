function mockInternal(module) {
  return function(methodName, value) {
    return jest.spyOn(module.internals, methodName).mockReturnValue(value);
  };
}

export { mockInternal };
export default { mockInternal };
