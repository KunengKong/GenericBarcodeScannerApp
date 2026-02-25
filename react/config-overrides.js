module.exports = function override(config) {

  config.output.filename = 'static/js/main.js';
  config.output.chunkFilename = 'static/js/chunkFile.js';

  const MiniCssExtractPlugin = config.plugins.find(
    plugin => plugin.constructor.name === 'MiniCssExtractPlugin'
  );

  if (MiniCssExtractPlugin) {
    MiniCssExtractPlugin.options.filename = 'static/css/main.css';
    MiniCssExtractPlugin.options.chunkFilename = 'static/css/chunkFile.css';
  }
  return config;
}