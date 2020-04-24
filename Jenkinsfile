library 'ModelonCommon@trunk'

def npm = 'docker run --rm -e NPM_TOKEN -v \$(pwd):/src -w /src node:12-alpine npm'

node('docker') {
  try {
    stage ('scm') {
      checkout(scm)
    }
    stage ('build') {
      sh "$npm install"
      sh "$npm run build"
    }
    stage ('test') {
      sh "$npm test"
    }
    stage ('publish') {
      withCredentials([string(credentialsId: 'npm-modelon-community', variable: 'NPM_TOKEN')]) {
        sh "NPM_TOKEN=$NPM_TOKEN $npm publish --access public --dry-run"
      }
    }
  }
  catch (e) {
    // Since we're catching the exception in order to report on it,
    // we need to re-throw it, to ensure that the build is marked as failed
    throw e
  }
}

