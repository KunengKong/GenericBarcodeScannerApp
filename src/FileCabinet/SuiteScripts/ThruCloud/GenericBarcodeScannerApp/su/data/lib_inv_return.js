/**
 * @NApiVersion 2.1
 */
define(['N/query', 'N/record'],
    /**
     * @param{query} query
     */
    (query, record) => {

        const PUBLIC = {}
        PUBLIC.returnItemRecieptLookUp = (options) => {
            log.debug('returnItemRecieptLookUp', options)
            const objOutput = {}

            const strItemReceiptQuery = `SELECT
                    transaction.id,
                    BUILTIN.DF(transaction.id) as transaction_name,
                    transactionline.item as itemid,
                    BUILTIN.DF(transactionline.item) as itemname,
                    ABS(transactionline.quantity) as max_quantity,
                    quantity = 0,
                FROM transaction
                JOIN transactionline
                    ON transaction.id = transactionline.transaction
                WHERE transaction.type = '${options.returnFrom == 'customer' ? 'RtnAuth' : 'VendAuth'}'
                AND transaction.custbody_tc_barcode_ean_13  = '${options.barcode}'
                AND transactionline.mainline = 'F'
                AND transactionline.item > 0`
            const arrSOResult = query.runSuiteQL({ query: strItemReceiptQuery }).asMappedResults()
            log.debug('arrSOResult', arrSOResult)
            const strQuery = `SELECT
                    item.id,
                    item.itemid,
                    item.custitem_tc_barcode_ean_13 as barcode,
                FROM item
                WHERE
                    item.custitem_tc_barcode_ean_13 = '${options.barcode}'`
            const arrItemResult = query.runSuiteQL({ query: strQuery }).asMappedResults()
            log.debug('arrItemResult', arrItemResult)

            if (!!arrSOResult.length) {
                objOutput.id = arrSOResult[0].id
                objOutput.name = arrSOResult[0].transaction_name
                objOutput.items = arrSOResult
                objOutput.type = options.returnFrom == 'customer' ? 'RtnAuth' : 'VendAuth'
                objOutput.quantity = 1
            } else if (!!arrItemResult.length) {
                objOutput.quantity = 0
                objOutput.item = arrItemResult[0]
                objOutput.type = "item"
            }
            log.debug('objOutput', objOutput)
            return objOutput
        }
        PUBLIC.processReturnAuthorization = (options) => {
            const objOutput = {}
            log.debug('processReturnAuthorization', options)
            const objInboundReturnRec = record.transform({
                fromType: record.Type.RETURN_AUTHORIZATION,
                fromId: options.items[0].id,
                toType: record.Type.ITEM_RECEIPT,
                isDynamic: true
            })

            const intLineReturnItem = objInboundReturnRec.getLineCount({ sublistId: 'item' })
            log.debug('intLineReturnItem', intLineReturnItem)
            for (let index = 0; index < objInboundReturnRec; index++) {
                objInboundReturnRec.selectLine({ sublistId: 'item', line: intLineReturnItem })
                objInboundReturnRec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'itemreceive', value: false })
                objInboundReturnRec.commitLine({ sublistId: 'item', line: intLineReturnItem })
            }
            for (const element of options.items[0].items) {
                const intLineReturnItem = objInboundReturnRec.findSublistLineWithValue({ sublistId: 'item', fieldId: 'item', value: element.itemid })
                if (intLineReturnItem < 0) continue
                if (!!element.quantity) continue
                objInboundReturnRec.selectLine({ sublistId: 'item', line: intLineReturnItem })
                objInboundReturnRec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'quantity', value: element.quantity })
                objInboundReturnRec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'itemreceive', value: true })
                objInboundReturnRec.commitLine({ sublistId: 'item', line: intLineReturnItem })
            }

            objOutput.inboundReturnId = objInboundReturnRec.save()

            log.debug('objOutput ', objOutput)

            return objOutput
        }
        return PUBLIC

    });
