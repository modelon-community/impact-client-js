const path = require("path");

module.exports = function(grunt) {
  grunt.initConfig({
    webpack: {
      myConfig: {
        mode: "development",
        entry: "./src/index.js",
        output: {
          filename: "index.js",
          path: path.resolve(__dirname, "dist")
        }
      }
    },

    clean: ["dist"]
  });

  grunt.loadNpmTasks("grunt-webpack");
  grunt.loadNpmTasks("grunt-contrib-clean");

  grunt.registerTask("build", ["webpack"]);

  grunt.registerTask("all", ["clean", "build"]);
  grunt.registerTask("default", ["all"]);
};
