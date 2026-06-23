// ───── src/setupProxy.js ─────
const { createProxyMiddleware } = require("http-proxy-middleware");

module.exports = function (app) {
  /* InMobi */
  app.use(
    "/inmobi",
    createProxyMiddleware({
      target: "https://publisher.inmobi.com",
      changeOrigin: true,
      secure: true,
      pathRewrite: { "^/inmobi": "" },
    })
  );

  /* Chartboost */
  app.use(
    "/chartboost",
    createProxyMiddleware({
      target: "https://api.chartboost.com",
      changeOrigin: true,
      secure: true,
      pathRewrite: { "^/chartboost": "" },
    })
  );

    app.use(
    "/pangle",
    createProxyMiddleware({
      target: "https://open-api.pangleglobal.com",
      changeOrigin: true,
      secure: true,
      pathRewrite: { "^/pangle": "" },
    })
  );

      app.use(
    "/mintegral",
    createProxyMiddleware({
      target: "https://dev.mintegral.com",
      changeOrigin: true,
      secure: true,
      pathRewrite: { "^/mintegral": "" },
    })
  );


};



