const ExpressMvc = require('../../src/ExpressMvc');
const request = require('ezzy-testing/request');
const logger = require('ezzy-logger').logger;
let app;

describe('ExpressMvc', () => {

  beforeAll(() => {
    logger.silence();
    // logger.level = 'debug';
    app = new ExpressMvc(__dirname + '/../../root', /xyzdotcom/, '/assets/');
    app.promise
      .then(() => app.bindExpressMvc(__dirname + '/../../root3',
        (basics) => basics.request.originalUrl.indexOf('otherApis/') > -1)
        .then(() => app.bindExpressMvc(__dirname + '/../../root2')
          .then(() => app.listen(9002))));
  });

  it('setup', done => setTimeout(() => done()));

  it('should contain proper attributes on a controller call', done => {
    app.listener.then(listener => {
      request(listener)
        .get('/apis/parameter' +
          '/a/b/c/d/e/f/g/h/i/j/k/l/m/n/o/p/q/r/s/t/u/v/w/x/y/z')
        .expect(200, {
          a: 'a',
          b: 'b',
          c: 'c',
          d: 'd',
          e: 'e',
          f: 'f',
          g: 'g',
          h: 'h',
          i: 'i',
          j: 'j',
          k: 'k',
          l: 'l',
          m: 'm',
          n: 'n',
          o: 'o',
          p: 'p',
          q: 'q',
          r: 'r',
          s: 's',
          t: 't',
          u: 'u',
          v: 'v',
          w: 'w',
          x: 'x',
          y: 'y',
          z: 'z'
        })
        .end(e => e ? fail(e) : done());
    });
  });

  it('should bind a 404 response when assets are not found', done => {
    app.listener.then(listener => {
      request(listener)
        .get('/assets/someDir/someInvalidJson.json')
        .expect(404)
        .end(e => e ? fail(e) : done());
    });
  });

  it('should not render anything when called from a different domain', done => {
    app.listener.then(listener => {
      request(listener)
        .get('/apis/secondExpress')
        .expect(404)
        .end(e => e ? fail(e) : done());
    });
  });

  it('should render an api call regardless of domain.', done => {
    app.listener.then(listener => {
      request(listener)
        .get('/otherApis/thirdExpress')
        .expect(200, {success: true})
        .end(e => e ? fail(e) : done());
    });
  });

  it('should render an api call with some final content', done => {
    app.listener.then(listener => {
      request(listener)
        .post('/otherApis/thirdExpress')
        .expect(200, 'done')
        .end(e => e ? fail(e) : done());
    });
  });

  it('should render from an alternate express app', done => {
    app.listener.then(listener => {
      request(listener)
        .get('/apis/express')
        .expect(200, {
          success: true,
          alternate: true
        })
        .end(e => e ? fail(e) : done());
    });
  });

  describe('should render parameters accordingly', () => {

    it('on GET', done => {
      app.listener.then(listener => {
        request(listener)
          .get('/apis/third/1/2/3')
          .expect(200, {a: 1, b: 2, c: 3})
          .end(e => e ? fail(e) : done());
      });
    });

    it('on PUT', done => {
      app.listener.then(listener => {
        request(listener)
          .put('/apis/third/1/2/3')
          .expect(200, {a: 1, b: 2, c: 3})
          .end(e => e ? fail(e) : done());
      });
    });

    it('on POST', done => {
      app.listener.then(listener => {
        request(listener)
          .post('/apis/third/1/2/3')
          .expect(200, {a: 1, b: 2, c: 3})
          .end(e => e ? fail(e) : done());
      });
    });

    it('on DELETE', done => {
      app.listener.then(listener => {
        request(listener)
          .del('/apis/third/1/2/3')
          .expect(200, {a: 1, b: 2, c: 3})
          .end(e => e ? fail(e) : done());
      });
    });

    it('on PATCH', done => {
      app.listener.then(listener => {
        request(listener)
          .patch('/apis/third/1/2/3')
          .expect(200, {a: 1, b: 2, c: 3})
          .end(e => e ? fail(e) : done());
      });
    });

  });

  describe('should render errors accordingly', () => {

    it('should display the default error', done => {
      app.listener.then(listener => {
        request(listener)
          .get('/anotherContext/?getError=not-found')
          .expect(404)
          .end(e => e ? fail(e) : done());
      });
    });

    it('should display a custom error', done => {
      app.listener.then(listener => {
        request(listener)
          .get('/anotherContext/?getError=server-error')
          .expect(500, 'Custom 500 error')
          .end(e => e ? fail(e) : done());
      });
    });

    it('should display a general error', done => {
      app.listener.then(listener => {
        request(listener)
          .get('/anotherContext/?getError=wrong-accept')
          .expect(406, '406')
          .end(e => e ? fail(e) : done());
      });
    });

  });

  afterAll(() => {
    app.close();
    logger.talk();
  });

});
