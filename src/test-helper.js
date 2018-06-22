function mock(module) {
  return function(methodName, value) {
    return jest.spyOn(module, methodName).mockReturnValue(value);
  };
}

export { mock };
export default { mock };
