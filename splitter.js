var fs = require("fs").promises;
var convert = require("xml-js");
var glob = require("glob");
var path = require("path");
var Deque = require("collections/deque");
var Map = require("collections/map");
const core = require("@actions/core");
const entities = require("entities");


let split = function (testPath, nodeIndex, nodeTotal, filesToExlude = []) {
  verify(testPath, nodeIndex, nodeTotal);
  return new Promise((resolve) => {
    glob(
      `${testPath}/**/*Test.kt`,
      { ignore: filesToExlude.map((value) => `${testPath}/**/${value}`) },
      function (er, files) {
        if (er != null) {
          throw new Error(`Error: Reading files from ${testPath}: ${er}`);
        }
        const tests = files
          .filter((value, index) => index % nodeTotal === nodeIndex)
          .map((value) => {
            return `--tests ${path.parse(value).name}`;
          })
          .join(" ");
        core.info(`Successfully created tests: ${tests}`);
        resolve(tests);
      }
    );
  });
};

let isTestFilesOnSyncWithTestResults = function (testFiles, testResultFiles) {
  let missingTests = [];
  let testResultFilesMap = new Map();
  testResultFiles.forEach((testResultFile) => {
    let fileName = path.parse(testResultFile).name.split(".").pop();
    if (!testResultFilesMap.has(fileName)) {
      testResultFilesMap.add(1, fileName);
    } else {
      testResultFilesMap.add(testResultFilesMap.get(fileName) + 1, fileName);
    }
  });
  testFiles.forEach((testFile) => {
    let fileName = path.parse(testFile).name;
    if (testResultFilesMap.has(fileName)) {
      testResultFilesMap.add(testResultFilesMap.get(fileName) - 1, fileName);
      if (testResultFilesMap.get(fileName) <= 0) {
        testResultFilesMap.delete(fileName);
      }
    } else {
      missingTests.push(fileName);
    }
  });
  if (missingTests.length != 0) {
    core.info(
      `WARNING: Test[${testFiles.length}] and TestResult[${testResultFiles.length}] are not in sync, unsync tests: ${missingTests}`
    );
    return false;
  } else {
    core.info(
      `SUCCESS: Test[${testFiles.length}] and TestResult[${testResultFiles.length}] are in sync, using timings for tests`
    );
    return true;
  }
};

let splitWithTiming = async function (
  testPath,
  testResultPath,
  nodeIndex,
  nodeTotal,
  filesToExlude = []
) {
  verify(testPath, nodeIndex, nodeTotal, filesToExlude);
  return new Promise((resolve) => {
    glob(
      `${testPath}/**/*Test.kt`,
      { ignore: filesToExlude.map((value) => `${testPath}/**/${value}`) },
      function (testFilesError, testFiles) {
        if (testFilesError != null) {
          throw new Error(
            `Error: Reading files from ${testPath}: ${testFilesError}`
          );
        }
        glob(
          `${testResultPath}/**/*.xml`,
          { ignore: filesToExlude.map((value) => `${testPath}/**/${value}`) },
          async function (testResultFilesError, testResultFiles) {
            if (testResultFilesError != null) {
              throw new Error(
                `Error: Reading files from ${testPath}: ${testResultFilesError}`
              );
            }
            if (!isTestFilesOnSyncWithTestResults(testFiles, testResultFiles)) {
              let tests = await split(
                testPath,
                nodeIndex,
                nodeTotal,
                filesToExlude
              );
              resolve(tests);
            } else {
              var deque = new Deque();
              var testResultTotalTime = 0;
              var i = 0;
              for (i = 0; i < testResultFiles.length; i++) {
                let xml = JSON.parse(
                  convert.xml2json(await fs.readFile(testResultFiles[i]))
                );
                let testClass = xml.elements[0]
                for (j = 0; j < testClass.elements.length; j++) {
                  let testFunction = testClass.elements[j]
                  if (testFunction.name !== "testcase") {
                    continue
                  }
                  let testClassName = testFunction.attributes.classname
                  let testName = testFunction.attributes.name;
                  let testTime = parseFloat(
                    testFunction.attributes.time
                  );
                  testResultTotalTime += testTime;
                  deque.add({ className: testClassName, name: testName, time: testTime });
                }
              }
              let testChunkMaxTime = testResultTotalTime / nodeTotal;
              for (i = 0; i < nodeTotal; i++) {
                let testNames = [];
                var testChunkCurrentTime = 0;
                var isPollLast = true;
                while (
                  deque.length != 0 &&
                  deque.length >= nodeTotal - i &&
                  (testChunkCurrentTime < testChunkMaxTime ||
                    i === nodeTotal - 1)
                ) {
                  let result = deque.shift();
                  testNames.push(`${result.className}.${result.name}`);
                  testChunkCurrentTime += result.time;
                  isPollLast = false;
                  if (deque.length !== 0 && i === nodeTotal - 1) {
                    continue;
                  } else if (
                    deque.length !== 0 &&
                    testChunkCurrentTime + deque.peek().time >
                      testChunkMaxTime &&
                    i < nodeTotal - nodeTotal / 4
                  ) {
                    break;
                  }
                }
                if (i === nodeIndex) {
                  if (i == nodeTotal - 1 && deque.length != 0) {
                    throw new Error(
                      `Error: Some test was not consumed: ${deque.length}`
                    );
                  }
                  let tests = testNames
                    .map((value) => {
                      return `--tests "${entities.encodeXML(value)}"`;
                    })
                    .join(" ");
                  core.info(
                    `Successfully created tests using timings: ${tests}`
                  );
                  resolve(tests);
                  return;
                }
              }
              throw new Error("Error: Unable to create tests");
            }
          }
        );
      }
    );
  });
};

let verify = function (directoryPath, nodeIndex, nodeTotal) {
  if (directoryPath === "") {
    throw new Error("Error: Require module");
  }
  if (nodeIndex < 0) {
    throw new Error(`Error: Invalid node-index: ${nodeIndex}`);
  }
  if (nodeTotal <= 0) {
    throw new Error(`Error: Invalid node-total: ${nodeTotal}`);
  }
  if (nodeIndex >= nodeTotal) {
    throw new Error(
      `Error: Invalid node-index: ${nodeIndex} is out of bounds, node-total: ${nodeTotal}`
    );
  }
};

module.exports = {
  split: split,
  splitWithTiming: splitWithTiming,
};
