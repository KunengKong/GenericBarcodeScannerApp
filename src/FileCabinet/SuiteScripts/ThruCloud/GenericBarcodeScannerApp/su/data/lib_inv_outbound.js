/**
 * @NApiVersion 2.1
 */
define(['N/query', 'N/record'],
    /**
 * @param{query} query
 * @param{record} record
 */
    (query, record) => {

        const PUBLIC = {}
        PUBLIC.outboundItemRecieptLookUp = (options) => {
            log.debug('outboundItemRecieptLookUp', options)
            const objOutput = {}

            const strItemReceiptQuery = `SELECT
                    transaction.id,
                    BUILTIN.DF(transaction.id) as transaction_name,
                    transaction.custbody_tc_barcode_ean_13 as barcode,
                    transactionline.item as itemid,
                    BUILTIN.DF(transactionline.item) as itemname,
                    transactionline.quantity,
                FROM transaction
                JOIN transactionline
                    ON transaction.id = transactionline.transaction
                WHERE transaction.type = 'ItemRcpt'
                AND transaction.custbody_tc_barcode_ean_13  = '${options.barcode}'
                AND transactionline.mainline = 'F'`
            const arrItemReceiptResult = query.runSuiteQL({ query: strItemReceiptQuery }).asMappedResults()

            log.debug('arrItemReceiptResult', arrItemReceiptResult)

            const strQuery = `SELECT
                    item.id,
                    item.itemid,
                    item.custitem_tc_barcode_ean_13 as barcode,
                FROM item
                WHERE
                    item.custitem_tc_barcode_ean_13 = '${options.barcode}'`
            const arrItemResult = query.runSuiteQL({ query: strQuery }).asMappedResults()
            log.debug('arrItemResult', arrItemResult)

            if (!!arrItemReceiptResult.length) {
                objOutput.id = arrItemReceiptResult[0].id
                objOutput.name = arrItemReceiptResult[0].transaction_name
                objOutput.items = arrItemReceiptResult
                objOutput.type = "itemReceipt"
            } else if (!!arrItemResult.length) {
                objOutput.item = arrItemResult[0]
                objOutput.type = "item"
            }
            log.debug('objOutput', objOutput)
            return objOutput
        }
        PUBLIC.processOutbound = (options) => {
            log.debug('processOutbound', options)

            try {

                const objCashSaleRec = record.create({ type: record.Type.CASH_SALE, isDynamic: true })
                objCashSaleRec.setValue('entity', options.customer)
                objCashSaleRec.setValue('location', options.location)
                let lineCount = 0
                for (const element of options.items) {
                    if (element.type == "item") {
                        objCashSaleRec.selectLine({ sublistId: 'item', line: lineCount })
                        objCashSaleRec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'item', value: element.item.id })
                        objCashSaleRec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'quantity', value: element.quantity })
                        objCashSaleRec.commitLine({ sublistId: 'item', line: lineCount })
                        lineCount++
                    }
                    if (element.type == "itemReceipt") {
                        for (const line of element.items) {
                            objCashSaleRec.selectLine({ sublistId: 'item', line: lineCount })
                            objCashSaleRec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'item', value: line.itemid })
                            objCashSaleRec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'quantity', value: line.quantity })
                            objCashSaleRec.commitLine({ sublistId: 'item', line: lineCount })
                            lineCount++
                        }
                    }
                }

                const intCashSaleId = objCashSaleRec.save()
                log.debug('intCashSaleId', intCashSaleId)
            } catch (e) {
                log.error('processOutbound', e)
            }
            const objOutput = {}
            return objOutput
        }
        return PUBLIC
    });
