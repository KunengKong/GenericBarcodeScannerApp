/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define([
    'N/ui/serverWidget',
    'N/file',
    './data/lib_inv_recount.js',
    './data/lib_inv_inbound.js',
    './data/lib_inv_outbound.js',
    './data/lib_inv_return.js',
    './data/lib_general.js',
],
    /**
 * @param{serverWidget} serverWidget
 */
    (
        serverWidget,
        file,
        libRecount,
        libInbound,
        libOutbound,
        libReturn,
        libGeneral) => {
        /**
         * Defines the Suitelet script trigger point.
         * @param {Object} scriptContext
         * @param {ServerRequest} scriptContext.request - Incoming request
         * @param {ServerResponse} scriptContext.response - Suitelet response
         * @since 2015.2
         */
        const onRequest = (scriptContext) => {
            scriptContext.response.setHeader({ name: 'Access-Control-Allow-Origin', value: '*' })
            scriptContext.response.setHeader({ name: 'Access-Control-Allow-Methods', value: 'GET, POST, OPTIONS' })
            scriptContext.response.setHeader({ name: 'Access-Control-Allow-Headers', value: 'Content-Type' })
            if (scriptContext.request.method == 'GET') {
                try {
                    const objFile = file.load({ id: '../build/index.html' })
                    const jsFile = file.load({ id: 'SuiteScripts/ThruCloud/GenericBarcodeScannerApp/build/static/js/main.js' })
                    const cssFile = file.load({ id: 'SuiteScripts/ThruCloud/GenericBarcodeScannerApp/build/static/css/main.css' })
                    const faviconFile = file.load({ id: 'SuiteScripts/ThruCloud/GenericBarcodeScannerApp/build/favicon.ico' })
                    const introImageFile = file.load({ id: 'SuiteScripts/ThruCloud/GenericBarcodeScannerApp/build/ims-app.png' })
                    log.debug('introImageFile.url', introImageFile.url)
                    let strHtmlContent = objFile.getContents()
                    strHtmlContent = strHtmlContent.replace('./static/js/main.js', jsFile.url)
                    strHtmlContent = strHtmlContent.replace('./static/css/main.css', cssFile.url)
                    strHtmlContent = strHtmlContent.replace('./favicon.ico', faviconFile.url)
                    strHtmlContent = strHtmlContent.replace('/ims-app.png', introImageFile.url)
                    scriptContext.response.write(strHtmlContent)
                } catch (e) {
                    scriptContext.response.write(e.message)
                }
            } else if (scriptContext.request.method == 'POST') {
                try {
                    const body = JSON.parse(scriptContext.request.parameters.data)
                    log.debug('body', body)
                    let output

                    if (body.page == 'recount')
                        output = libRecount[body.action](body?.data)
                    else if (body.page == 'inbound')
                        output = libInbound[body.action](body?.data)
                    else if (body.page == 'outbound')
                        output = libOutbound[body.action](body?.data)
                    else if (body.page == 'general')
                        output = libGeneral[body.action](body?.data)
                    else if (body.page == 'return')
                        output = libReturn[body.action](body?.data)

                    else
                        output = { page: 'error', message: 'page not found' }

                    // log.debug('output', output)
                    scriptContext.response.write(JSON.stringify(output))

                } catch (e) {
                    log.error('e', e)
                    let output = {
                        error: e,
                        items: []
                    }
                    scriptContext.response.write(JSON.stringify(output))
                }
            }
        }

        return { onRequest }

    });
