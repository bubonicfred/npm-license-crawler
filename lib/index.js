var path = require('path'),
DirectoryReader = require('./directoryreader'),
checker = require('license-checker'),
async = require('async'),
fs = require('fs');

const dumpLicenses = function(args, callback) {
  var reader = new DirectoryReader(args.start, args.exclude),
  licenses = {},
  filePaths = [],
  solution = null;
  version = null;

  let dependencies = {};
  let devDependencies = {};

  reader
  .on("file", function (file, stat, fullPath) {
    if (file === "package.json") {
      //console.log('Analyzing file: %s, %d bytes', file, stat.size, fullPath);
      filePaths.push(fullPath);
      if (args.direct) {
        var packageJsonContents = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
        const name = packageJsonContents.name;
        solution = packageJsonContents.name;
        version = packageJsonContents.version;

        if (args.development && packageJsonContents.devDependencies && packageJsonContents.name) {
          devDependencies = packageJsonContents.devDependencies;
        } else if(packageJsonContents.dependencies && packageJsonContents.name){
          dependencies = packageJsonContents.dependencies;
        }
      }
    }
    reader.next();
  })
  .on("dir", function (dir) {
    if ((dir === ".git") || (dir === "node_modules")) {
      reader.next();
    }
    else {
      reader.list();
    }
  })
  .on("done", function (error) {
    if (! error) {
      async.eachSeries(filePaths, function (filePath, iteratorCallback) {
        args.start = path.dirname(filePath);
        checker.init(args, function(err, pkgs) {
          const output = {
            dependencies: {},
            devDependencies: {},
          };
        
          if (err) {
            console.error(err);
          } else {
            Object.keys(pkgs).forEach((pkg) => {
              const pkgName = pkg.replace(/@[^@]+$/, '');
              if (dependencies[pkgName]) {
                output.dependencies[pkgName] = pkgs[pkg];
              }
              if (devDependencies[pkgName]) {
                output.devDependencies[pkgName] = pkgs[pkg];
              }
            });
          }
          
          licenses = Object.assign(licenses, {...output.dependencies, ...output.devDependencies});
          iteratorCallback();
        });
        
      }, function (error) {
        callback(error, {
          solution,
          version,
          dependencies: licenses
        });
      });
    }
    else {
      console.error(error);
      callback(error, licenses);
    }
  });
};

module.exports.dumpLicenses = dumpLicenses;