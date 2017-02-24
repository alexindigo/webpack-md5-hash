var crypto = require('crypto');

module.exports = WebpackChunkHash;

function WebpackChunkHash(options)
{
  options = options || {};
  this.algorithm = options.algorithm || 'md5';
  this.digest = options.digest || 'hex';
  this.additionalHashContent = options.additionalHashContent;
  this.dllManifestPath = options.dllManifestPath;
}

WebpackChunkHash.prototype.apply = function(compiler)
{
  var _plugin = this;

  compiler.plugin('compilation', function(compilation)
  {
    compilation.plugin('chunk-hash', function(chunk, chunkHash)
    {
      var source = chunk.modules.map(getModuleSource).sort(sortById).reduce(concatenateSource, '');

      if (_plugin.additionalHashContent) {
        source = source + _plugin.additionalHashContent(chunk);
      }
      if (_plugin.dllManifestPath) {
        source = source + _plugin.makeDllHash();
      }

      chunkHash.digest = function(digest)
      {
        return _plugin.update(source).digest(digest || _plugin.digest);
      };
    });
  });
};

WebpackChunkHash.prototype.makeDllHash = function() {
  var source = '';
  if (typeof this.dllManifestPath === 'string') {
    try {
      source = JSON.stringify(require(this.dllManifestPath));
    } catch (e) {
      return '';
    }
  }
  return source;
}

WebpackChunkHash.prototype.update = function(source) {
  return crypto.createHash(this.algorithm).update(source)
}

// helpers

function sortById(a, b)
{
  return a.id - b.id;
}

function getModuleSource(module)
{
  return {
    id    : module.id,
    source: (module._source || {})._value || '',
    dependencies: (module.dependencies || []).map(function(d){ return d.module ? d.module.id : ''; })
  };
}

function concatenateSource(result, module)
{
  return result + '#' + module.id + ':' + module.source + '$' + (module.dependencies.join(','));
}
