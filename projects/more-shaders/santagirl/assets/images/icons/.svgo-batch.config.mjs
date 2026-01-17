// .svgo-batch.config.mjs — SVGO v3+
export default {
  multipass: true,
  plugins: [
    { name: 'preset-default' },

    // Keep responsiveness & IDs
    { name: 'removeViewBox', active: false },
    { name: 'removeDimensions', active: false },
    { name: 'cleanupIds', active: false },

    // Ensure XML namespace (Quick Look, etc.)
    { name: 'removeXMLNS', active: false },
    {
      name: 'addAttributesToSVGElement',
      params: { attributes: [{ xmlns: 'http://www.w3.org/2000/svg' }] }
    },

    // Safe cleanups
    { name: 'removeScripts' },
    { name: 'removeStyleElement' },
    { name: 'cleanupEnableBackground' },
    { name: 'removeUselessDefs' },
    { name: 'removeEmptyAttrs' },
    { name: 'removeEmptyContainers' },
    { name: 'removeUnusedNS' },
    { name: 'mergePaths' },
    { name: 'convertEllipseToCircle' },

    // Precision & styling
    { name: 'convertPathData', params: { floatPrecision: 3, transformPrecision: 4 } },
    { name: 'cleanupNumericValues', params: { floatPrecision: 3 } },
    { name: 'convertColors', params: { currentColor: false } },
    { name: 'inlineStyles', params: { onlyMatchedOnce: false } },
    { name: 'minifyStyles' },
    { name: 'mergeStyles' }
  ]
};
