const module = {
  /**
   * Returns a method to mock the specified module
   * @param {Object} moduleToMock The module to mock
   * @returns {Function} Function to call with methodName and (optional) return value
   **/
  mock(moduleToMock) {
    return function(methodName, value) {
      return jest.spyOn(moduleToMock, methodName).mockReturnValue(value);
    };
  },
};

export default module;
