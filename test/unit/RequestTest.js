const Request = require('../../src/Request');
let request;

describe('Test', () => {

  beforeEach(() => {
    request = new Request();
  });

  it('should have the default accept authorizations', done => {
    expect(request.auth()).toEqual(true);
    expect(request.authGet()).toEqual(true);
    expect(request.authDelete()).toEqual(true);
    expect(request.authPatch()).toEqual(true);
    expect(request.authPut()).toEqual(true);
    expect(request.authPost()).toEqual(true);
    expect(request.authOptions()).toEqual(true);
    expect(request.authHead()).toEqual(true);
    done();
  });

  it('should return the default method not allowed responses', done => {
    spyOn(request, 'methodNotAllowedError');
    request.doGet('get');
    expect(request.methodNotAllowedError).toHaveBeenCalledWith('get');
    request.doPost('post');
    expect(request.methodNotAllowedError).toHaveBeenCalledWith('post');
    request.doPut('put');
    expect(request.methodNotAllowedError).toHaveBeenCalledWith('put');
    request.doPatch('patch');
    expect(request.methodNotAllowedError).toHaveBeenCalledWith('patch');
    request.doDelete('delete');
    expect(request.methodNotAllowedError).toHaveBeenCalledWith('delete');
    request.doOptions('options');
    expect(request.methodNotAllowedError).toHaveBeenCalledWith('options');
    spyOn(request, 'sendStatusAndEnd');
    request.doHead('head');
    expect(request.sendStatusAndEnd).toHaveBeenCalled();
    done();
  });

});