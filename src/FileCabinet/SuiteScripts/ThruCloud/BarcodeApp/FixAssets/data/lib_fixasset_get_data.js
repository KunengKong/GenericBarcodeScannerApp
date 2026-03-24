/**
 * @NApiVersion 2.1
 */
define(['N/query'],

    (query) => {

        const PUBLIC = {}
        PUBLIC.fixAssetLookUp = (data) => {
            log.debug('fixAssetLookUp', data)
            const objOutput = {
                fixAsset: {}
            }
            const strQuery = `SELECT
                altname as asset_main_name,
                custrecord_assetdescr as asset_main_description,
                BUILTIN.DF(custrecord_assettype) as asset_main_type,
                custrecord_assetcost as asset_main_cost,
                custrecord_assetcurrentcost as asset_main_current_cost,
                BUILTIN.DF(custrecord_assetaccmethod) as asset_main_account_method,
                custrecord_assetlifetime as asset_main_lifetime,
                BUILTIN.DF(custrecord_assetdeprperiod) as asset_main_depreciate_period,
                BUILTIN.DF(custrecord_assetstatus) as asset_main_status,

                -- GENERAL --
                BUILTIN.DF(custrecord_assetsubsidiary) as asset_general_subsidiary,
                BUILTIN.DF(custrecord_assetlocation) as asset_general_location,
                BUILTIN.DF(custrecord_assetcaretaker) as asset_general_custodian,
                custrecord_assetpurchasedate as asset_general_purchase_date,
                custrecord_assetdeprstartdate as asset_general_depreciate_start_date,
                custrecord_assetdeprenddate as asset_general_depreciate_end_date,
                (CURRENT_DATE - custrecord_assetpurchasedate) as asset_general_current_age,
                custrecord_assetdeprenddate - custrecord_assetdeprstartdate as asset_general_last_depreciate_date,
                BUILTIN.DF(custrecord_assetdepractive) as asset_general_depreciate_active,
                BUILTIN.DF(custrecord_assetdeprrules) as asset_general_depreciate_rules,
                
                -- ACCOUNTS --
                BUILTIN.DF(custrecord_assetmainacc) as asset_accounts_main_account,
                BUILTIN.DF(custrecord_assetdepracc) as asset_accounts_depreciate_account,
                BUILTIN.DF(custrecord_assetdeprchargeacc) as asset_accounts_depreciate_charge_account,
                BUILTIN.DF(custrecord_assetwriteoffacc) as asset_accounts_write_off_account,
                BUILTIN.DF(custrecord_assetwritedownacc) as asset_accounts_write_down_account,
                BUILTIN.DF(custrecord_assetdisposalacc) as asset_accounts_disposal_account,

                -- INSURANCE --
                BUILTIN.DF(custrecord_assetinsurancecoy) as asset_insurance_company,
                custrecord_assetinsurancepolicyno as asset_insurance_policy_no,
                custrecord_assetinsurancestartdate as asset_insurance_start_date,
                custrecord_assetinsuranceenddate as asset_insurance_end_date,
                custrecord_assetinsurancevalue as asset_insurance_value,
                custrecord_assetinsurancepaymentfreq as asset_insurance_payment_freq,
                custrecord_assetinsurancepaymentamt as asset_insurance_payment_amt,

            FROM customrecord_ncfar_asset
            WHERE 
                customrecord_ncfar_asset.custrecord_tc_ims_barcode_fam = '${data.barcode}'`
            log.debug('fixAssetLookUp | strQuery', strQuery)

            const objFixAssetResult = query.runSuiteQL({ query: strQuery }).asMappedResults()[0]
            log.debug('fixAssetLookUp | objFixAssetResult', objFixAssetResult)

            for (const key in objFixAssetResult) {
                let strGroup = key.split('_')[1]
                if (!objOutput.fixAsset[strGroup])
                    objOutput.fixAsset[strGroup] = {}

                objOutput.fixAsset[strGroup] = { ...objOutput.fixAsset[strGroup], [key]: objFixAssetResult[key] }
            }


            return objOutput
        }
        return PUBLIC

    });
