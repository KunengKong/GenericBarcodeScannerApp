/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/query', 'N/ui/serverWidget'],
    /**
 * @param{query} query
 */
    (query, serverWidget) => {
        /**
         * Defines the function definition that is executed before record is loaded.
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
         * @param {Form} scriptContext.form - Current form
         * @param {ServletRequest} scriptContext.request - HTTP request information sent from the browser for a client action only.
         * @since 2015.2
         */
        var strFieldId = '_tc_barcode_ean_13'
        const beforeLoad = (scriptContext) => {
            try {
                if (scriptContext.type !== scriptContext.UserEventType.VIEW) return
                var form = scriptContext.form
                var curRec = scriptContext.newRecord
                log.debug('beforeLoad type', curRec.type)
                var barcodeValue = curRec.getValue({ fieldId: 'custitem' + strFieldId }) || curRec.getValue({ fieldId: 'custbody' + strFieldId })

                if (!barcodeValue) return
                var inlineHtmlField = form.addField({
                    id: 'custpage_barcode_html',
                    type: serverWidget.FieldType.INLINEHTML,
                    label: 'Barcode'
                })

                inlineHtmlField.defaultValue =
                    "<div style='margin-top:10px;'>" +
                    "<img alt='Barcode Generator TEC-IT' " +
                    "src='https://barcode.tec-it.com/barcode.ashx?data=" +
                    barcodeValue +
                    "&code=EAN13' />" +
                    "</div>"
            } catch (e) {
                log.error('beforeLoad', e)
            }
        }

        /**
         * Defines the function definition that is executed before record is submitted.
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {Record} scriptContext.oldRecord - Old record
         * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
         * @since 2015.2
         */
        const beforeSubmit = (scriptContext) => {
            try {
                const curRec = scriptContext.newRecord
                const intBarcode = curRec.getValue('custitem' + strFieldId) || curRec.getValue('custbody' + strFieldId)
                if (intBarcode) return true
                const isItemRecord = curRec.type.includes('item')

                let strQuery
                if (isItemRecord)
                    strQuery = `SELECT custitem_tc_barcode_ean_13 FROM item`
                else
                    strQuery = `SELECT custbody_tc_barcode_ean_13 FROM transaction`

                log.debug('strQuery', strQuery)
                const arrBarcodes = []
                const arrResult = query.runSuiteQL({ query: strQuery }).asMappedResults()
                for (let element of arrResult) {
                    if (!arrBarcodes.includes(element.barcode))
                        arrBarcodes.push(element.barcode)
                }
                const newBarcode = generateUniqueEAN13(arrBarcodes)

                curRec.setValue('custitem' + strFieldId, newBarcode)
                curRec.setValue('custbody' + strFieldId, newBarcode)

            } catch (e) {
                log.error('error', e)
            }
        }


        function generateEAN13() {
            let digits = [];
            for (let i = 0; i < 12; i++) {
                digits.push(Math.floor(Math.random() * 10));
            }

            let sum = 0;
            for (let i = 0; i < 12; i++) {
                sum += (i % 2 === 0)
                    ? digits[i]
                    : digits[i] * 3;
            }

            let checkDigit = (10 - (sum % 10)) % 10;

            return digits.join('') + checkDigit;
        }

        function generateUniqueEAN13(existingBarcodes) {
            let barcode;

            do {
                barcode = generateEAN13();
            } while (existingBarcodes.includes(barcode));

            return barcode;
        }

        /**
         * Defines the function definition that is executed after record is submitted.
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {Record} scriptContext.oldRecord - Old record
         * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
         * @since 2015.2
         */
        const afterSubmit = (scriptContext) => {

        }

        return { beforeLoad, beforeSubmit, afterSubmit }

    });
