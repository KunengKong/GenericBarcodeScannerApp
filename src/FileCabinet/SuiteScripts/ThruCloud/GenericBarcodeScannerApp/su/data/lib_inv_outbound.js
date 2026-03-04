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
            objOutput.isCustomer = options.step == 'outforcustomer'
            const strItemReceiptQuery = `SELECT
                    transaction.id,
                    BUILTIN.DF(transaction.id) as transaction_name,
                    transaction.custbody_tc_barcode_ean_13 as barcode,
                    transactionline.item as itemid,
                    BUILTIN.DF(transactionline.item) as itemname,
                    0 as quantity,
                    ABS(transactionline.quantity) - ABS(transactionline.quantitypicked) as max_quantity,
                    transactionline.location as fromlocation,
                    transaction.transferlocation as tolocation,
                FROM transaction
                JOIN transactionline
                    ON transaction.id = transactionline.transaction
                WHERE transaction.type = '${objOutput.isCustomer ? 'SalesOrd' : 'TrnfrOrd'}'
                AND transaction.custbody_tc_barcode_ean_13  = '${options.barcode}'
                AND transactionline.mainline = 'F'
                AND transactionline.item > 0
                ${objOutput.isCustomer ? '' : "AND transactionline.hasfulfillableitems = 'T'"}`
            log.debug('strItemReceiptQuery', strItemReceiptQuery)
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
                objOutput.fromLocation = arrItemReceiptResult[0].fromlocation
                objOutput.toLocation = arrItemReceiptResult[0].tolocation
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
        PUBLIC.processOutboundForCustomer = (options) => {
            log.debug('processOutboundForCustomer', options)
            const objOutput = {}
            try {
                const strSOQuery = `SELECT
                    transaction.id,
                    transaction.custbody_tc_barcode_ean_13 as barcode
                FROM transaction
                WHERE transaction.type = 'SalesOrd'
                AND transaction.custbody_tc_barcode_ean_13  = '${options.barcode}'`
                const objSOResult = query.runSuiteQL({ query: strSOQuery }).asMappedResults()[0]
                log.debug('objSOResult', objSOResult)

                const objItemFullfilmentRec = record.transform({
                    fromType: record.Type.SALES_ORDER,
                    fromId: objSOResult.id,
                    toType: record.Type.ITEM_FULFILLMENT,
                    isDynamic: true,
                })

                objItemFullfilmentRec.setValue('custbody_tc_barcode_ean_13', null)
                const intIFLineCount = objItemFullfilmentRec.getLineCount({ sublistId: 'item' })
                log.debug('intIFLineCount', intIFLineCount)
                for (let index = 0; index < intIFLineCount; index++) {
                    objItemFullfilmentRec.selectLine({ sublistId: 'item', line: index })
                    objItemFullfilmentRec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'itemreceive', value: false })
                    objItemFullfilmentRec.commitLine({ sublistId: 'item', line: index })
                }
                for (const element of options.items[0].items) {
                    log.debug('element', element)
                    const intLinePOItem = objItemFullfilmentRec.findSublistLineWithValue({ sublistId: 'item', fieldId: 'item', value: element.itemid })
                    if (intLinePOItem < 0) continue
                    objItemFullfilmentRec.selectLine({ sublistId: 'item', line: intLinePOItem })
                    objItemFullfilmentRec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'itemreceive', value: !!element.quantity })
                    objItemFullfilmentRec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'quantity', value: element.quantity })
                    objItemFullfilmentRec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'location', value: options.fromLocation })
                    objItemFullfilmentRec.commitLine({ sublistId: 'item', line: intLinePOItem })
                }
                objOutput.intIFId = objItemFullfilmentRec.save()
            } catch (e) {
                log.error('processOutbound', e)
            }
            log.debug('objOutput', objOutput)
            return objOutput
        }

        PUBLIC.outboundProcessIF = (options) => {
            log.debug('outboundProcessIF', options)
            const objOutput = {
                step: options.step
            }
            try {
                const strIFQuery = `SELECT
                        transaction.id,
                        transaction.custbody_tc_barcode_ean_13 as barcode
                    FROM transaction
                    WHERE transaction.type = 'ItemShip'
                    AND transaction.custbody_tc_barcode_ean_13  = '${options.barcode}'`
                log.debug('objIFResult', strIFQuery)
                const objIFResult = query.runSuiteQL({ query: strIFQuery }).asMappedResults()[0]
                log.debug('objIFResult', objIFResult)
                if (options.step == 'pack')
                    objOutput.shipstatus = 'B'
                if (options.step == 'ship')
                    objOutput.shipstatus = 'C'

                objOutput.intIFId = record.submitFields({
                    type: record.Type.ITEM_FULFILLMENT,
                    id: objIFResult.id,
                    values: {
                        shipstatus: objOutput.shipstatus //B = Packed, C = Shipped
                    }
                })

            } catch (e) {
                log.error('outboundProcessIF', e)
            }
            log.debug('objOutput', objOutput)
            return objOutput
        }
        return PUBLIC
    });
