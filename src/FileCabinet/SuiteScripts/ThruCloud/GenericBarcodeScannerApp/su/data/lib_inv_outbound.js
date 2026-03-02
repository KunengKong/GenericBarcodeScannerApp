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
                objOutput.quantity = 1
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
                const objSalesOrderRec = record.create({ type: record.Type.SALES_ORDER, isDynamic: true })
                objSalesOrderRec.setValue('entity', options.customer)
                objSalesOrderRec.setValue('location', options.location)
                let lineCount = 0
                for (const element of options.items) {
                    if (element.type == "item") {
                        objSalesOrderRec.selectLine({ sublistId: 'item', line: lineCount })
                        objSalesOrderRec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'item', value: element.item.id })
                        objSalesOrderRec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'quantity', value: element.quantity })
                        objSalesOrderRec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_tc_barcode_ean_13', value: element.barcode })
                        objSalesOrderRec.commitLine({ sublistId: 'item', line: lineCount })
                        lineCount++
                    }
                    if (element.type == "itemReceipt") {
                        for (const line of element.items) {
                            objSalesOrderRec.selectLine({ sublistId: 'item', line: lineCount })
                            objSalesOrderRec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'item', value: line.itemid })
                            objSalesOrderRec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'quantity', value: line.quantity })
                            objSalesOrderRec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_tc_barcode_ean_13', value: line.barcode })
                            objSalesOrderRec.commitLine({ sublistId: 'item', line: lineCount })
                            lineCount++
                        }
                    }
                }

                const intSalesOrderId = objSalesOrderRec.save()
                log.debug('intSalesOrderId', intSalesOrderId)


                const objItemFullfilmentRec = record.transform({
                    fromType: record.Type.SALES_ORDER,
                    fromId: intSalesOrderId,
                    toType: record.Type.ITEM_FULFILLMENT,
                    isDynamic: true,
                })

                objItemFullfilmentRec.setValue('shipstatus', 'C')
                objItemFullfilmentRec.setValue('custbody_tc_barcode_ean_13', '------')
                const intIFLineCount = objItemFullfilmentRec.getLineCount({ sublistId: 'item' })
                log.debug('intIFLineCount', intIFLineCount)
                for (let index = 0; index < intIFLineCount; index++) {
                    const intQuantity = objItemFullfilmentRec.getSublistValue({ sublistId: 'item', fieldId: 'quantityremaining', line: index })

                    log.debug('intQuantity', intQuantity)
                    objItemFullfilmentRec.selectLine({ sublistId: 'item', line: index })
                    objItemFullfilmentRec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'quantity', value: intQuantity })
                    // objItemFullfilmentRec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'itemreceive', value: true })
                    objItemFullfilmentRec.commitLine({ sublistId: 'item', line: index })

                }
                const intItemReceiptId = objItemFullfilmentRec.save()
                log.debug('intItemReceiptId', intItemReceiptId)
            } catch (e) {
                log.error('processOutbound', e)
            }
            const objOutput = {}
            return objOutput
        }
        return PUBLIC
    });
