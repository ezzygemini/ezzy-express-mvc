const ExpressMvc = require("../../src/ExpressMvc");
const request = require("ezzy-testing/request");
const logger = require("ezzy-logger").logger;
let app;

describe("Render", () => {
  beforeAll(() => {
    logger.silence();
    app = new ExpressMvc({
      directory: __dirname + "/../../root",
      statics: "/assets/",
      otherStatics: ["/root3/someStaticDirectory/"]
    });
    app.listen(9001);
  });

  it("should invoke the get method properly", done => {
    app.listener.then(listener => {
      request(listener)
        .get("/")
        .expect(/src=".*\/someDependency\.js"/)
        .expect(/src=".*\/anotherDependency\.js"/)
        .expect(/href=".*\/someDependency\.css"/)
        .expect(/href=".*\/anotherDependency\.css"/)
        .end(e => (e ? fail(e) : done()));
    });
  });

  it("should have bound static assets before the application", done => {
    app.listener.then(listener => {
      request(listener)
        .get("/assets/someDir/test.json")
        .expect(200, {
          hello: "world"
        })
        .end(e => (e ? fail(e) : done()));
    });
  });

  it("should have bound other static directories before the app", done => {
    app.listener.then(listener => {
      request(listener)
        .get("/__/root3/someStaticDirectory/helloWorld.html")
        .expect(/Hello world from a static directory/)
        .end(e => (e ? fail(e) : done()));
    });
  });

  it("should populate the model with the configuration file flags", done => {
    app.listener.then(listener => {
      request(listener)
        .get("/")
        .expect(/My little elephant/i)
        .end(e => (e ? fail(e) : done()));
    });
  });

  it("should return a json model representation", done => {
    app.listener.then(listener => {
      request(listener)
        .get("/model.json")
        .expect(response => {
          expect(JSON.parse(response.text)).toEqual(
            jasmine.objectContaining({
              title: "Hello World"
            })
          );
        })
        .end(e => (e ? fail(e) : done()));
    });
  });

  it("should invoke the head method properly", done => {
    app.listener.then(listener => {
      request(listener)
        .head("/")
        .expect(200)
        .end(e => (e ? fail(e) : done()));
    });
  });

  describe("helpers should bind to the mvc", () => {
    it("process the helper content", done => {
      app.listener.then(listener => {
        request(listener)
          .get("/")
          .expect(/Content from test helper/)
          .end(e => (e ? fail(e) : done()));
      });
    });

    it("include other partials from specified directories", done => {
      app.listener.then(listener => {
        request(listener)
          .get("/")
          .expect(/Some Random Partial/)
          .end(e => (e ? fail(e) : done()));
      });
    });

    it("include other partials from outside directories", done => {
      app.listener.then(listener => {
        request(listener)
          .get("/")
          .expect(/Another Random Partial/)
          .end(e => (e ? fail(e) : done()));
      });
    });
  });

  afterAll(() => {
    app.close();
    logger.talk();
  });
});
