const split = require("./splitter").split;
const splitWithTiming = require("./splitter").splitWithTiming;

// Validaton

test("invalid test for invalid node-index", async () => {
  expect(() => {
    split("./data/test-missing", -1, 1);
  }).toThrow(Error);
});

test("invalid test for node-index out-of-bounds", async () => {
  expect(() => {
    split("./data/test-missing", 3, 3);
  }).toThrow(Error);
});

test("invalid test for invalid node-total", async () => {
  expect(() => {
    split("./data/test-missing", 0, 0);
  }).toThrow(Error);
  expect(() => {
    split("./data/test-missing", 0, -1);
  }).toThrow(Error);
});

// Split

test("valid tests for a single test", async () => {
  var tests = await split("./data/test-1", 0, 3);
  expect(tests).toEqual("--tests Hello1Test");
});

test("valid tests for a multiple test", async () => {
  var tests = await split("./data/test-1", 0, 1);
  expect(tests).toEqual(
    "--tests Hello1Test --tests Hello2Test --tests Hello3Test"
  );
});

test("valid tests for a multiple test with single ignore file", async () => {
  var tests = await split("./data/test-1", 0, 1, ["Hello3Test.kt"]);
  expect(tests).toEqual("--tests Hello1Test --tests Hello2Test");
});

test("valid tests for a multiple test with multiple ignore files", async () => {
  var tests = await split("./data/test-1", 0, 1, [
    "Hello3Test.kt",
    "Hello2Test.kt",
  ]);
  expect(tests).toEqual("--tests Hello1Test");
});

test("invalid test for missing directory", async () => {
  var tests = await split("./data/test-missing", 0, 1);
  expect(tests).toEqual("");
});

// Split with Timings

test("valid test functions with timings on first node index", async () => {
  var tests = await splitWithTiming(
    "./data/test-1",
    "./data/test-result/test-app-result/",
    0,
    3
  );
  expect(tests).toEqual(
    '--tests "com.sample.Hello1Test.verify 1" --tests "com.sample.Hello1Test.verify 2" --tests "com.sample.Hello1Test.verify 3" --tests "com.sample.Hello2Test.verify 1"'
  );
});

test("valid test functions with timings on last node index", async () => {
  var tests = await splitWithTiming(
    "./data/test-1",
    "./data/test-result/test-app-result/",
    2,
    3
  );
  expect(tests).toEqual(
    '--tests "com.sample.Hello3Test.verify 6" --tests "com.sample.Hello3Test.verify 7" ' +
      '--tests "com.sample.Hello3Test.verify 8" --tests "com.sample.Hello3Test.verify 9" --tests "com.sample.Hello3Test.verify 10" ' +
      '--tests "com.sample.Hello3Test.&apos;verify 11&apos;" --tests "com.sample.Hello3Test.&quot;verify 12&quot;"'
  );
});

test("valid test functions with timings on 1 node total", async () => {
  var tests = await splitWithTiming(
    "./data/test-1",
    "./data/test-result/test-app-result/",
    0,
    1
  );
  expect(tests).toEqual(
    '--tests "com.sample.Hello1Test.verify 1" --tests "com.sample.Hello1Test.verify 2" --tests "com.sample.Hello1Test.verify 3" ' +
      '--tests "com.sample.Hello2Test.verify 1" --tests "com.sample.Hello3Test.verify 1" --tests "com.sample.Hello3Test.verify 2" ' +
      '--tests "com.sample.Hello3Test.verify 3" --tests "com.sample.Hello3Test.verify 4" --tests "com.sample.Hello3Test.verify 5" ' +
      '--tests "com.sample.Hello3Test.verify 6" --tests "com.sample.Hello3Test.verify 7" --tests "com.sample.Hello3Test.verify 8" ' +
      '--tests "com.sample.Hello3Test.verify 9" --tests "com.sample.Hello3Test.verify 10" --tests "com.sample.Hello3Test.&apos;verify 11&apos;" ' +
      '--tests "com.sample.Hello3Test.&quot;verify 12&quot;"'
  );
});

test("invalid tests with timings not in sync for a single test", async () => {
  var tests = await splitWithTiming(
    "./data/test-1",
    "./data/test-result/test-app2-result/",
    1,
    3
  );
  expect(tests).toEqual("--tests Hello2Test");
});

test("invalid tests with timings not in sync for a multiple test", async () => {
  var tests = await splitWithTiming(
    "./data/test-1",
    "./data/test-result/test-app2-result/",
    0,
    1
  );
  expect(tests).toEqual(
    "--tests Hello1Test --tests Hello2Test --tests Hello3Test"
  );
});

test("valid tests with timings and the same class name", async () => {
  var tests = await splitWithTiming(
    "./data/test-1",
    "./data/test-result/",
    1,
    3
  );
  expect(tests).toEqual(
    '--tests "com.sample.Hello3Test.verify 7" --tests "com.sample.Hello3Test.verify 8" ' +
      '--tests "com.sample.Hello3Test.verify 9" --tests "com.sample.Hello3Test.verify 10" ' +
      '--tests "com.sample.Hello3Test.&apos;verify 11&apos;" --tests "com.sample.Hello3Test.&quot;verify 12&quot;" ' +
      '--tests "com.sample.1.Hello1Test.verify 1" --tests "com.sample.1.Hello1Test.verify 2" ' +
      '--tests "com.sample.1.Hello1Test.verify 3" --tests "com.sample.1.Hello2Test.verify 1"'
  );
});
