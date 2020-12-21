
import _forEach from 'lodash/forEach'

import NavStore from '../../components/navigation/NavStore'

import customCurrencyActions from '../../appstores/Actions/CustomCurrencyActions'
import { showModal } from '../../appstores/Stores/Modal/ModalActions'
import { setLoaderStatus } from '../../appstores/Stores/Main/MainStoreActions'
import currencyActions from '../../appstores/Stores/Currency/CurrencyActions'

import BlocksoftDict from '../../../crypto/common/BlocksoftDict'

import { strings } from '../../services/i18n'
import Log from '../../services/Log/Log'


export const ASSESTS_GROUP = {
    ALL: 'ALL',
    COINS: 'COINS',
    TOKENS: 'TOKENS',
    CUSTOM: 'CUSTOM',
}

export const getTabs = () => [
    {
        title: strings('assets.tabAll'),
        index: 0,
        active: true,
        group: ASSESTS_GROUP.ALL
    },
    {
        title: strings('assets.tabCoins'),
        index: 1,
        active: false,
        group: ASSESTS_GROUP.COINS
    },
    {
        title: strings('assets.tabTokens'),
        index: 2,
        active: false,
        group: ASSESTS_GROUP.TOKENS
    },
    {
        title: strings('assets.tabCustom'),
        index: 3,
        active: false,
        group: ASSESTS_GROUP.CUSTOM
    },
]


/**
 * Helpers called from the container with .call (function has context of the container)
 * @param {Array<Object>} assets
 * @param {Object} newTab
 * @param {string} searchQuery
 */
export function prepareDataForDisplaying(assets, newTab, searchQuery) {
    if (typeof searchQuery !== 'string') searchQuery = this.state.searchQuery
    const { tabs } = this.state
    const activeTab = newTab || tabs.find(tab => tab.active)
    const newTabs = tabs.map(tab => ({ ...tab, active: tab.index === activeTab.index }))

    const notAddedAssets = []
    _forEach(BlocksoftDict.Currencies, (currency, currencyCode) => {
        let tmpCurrency = assets.find(as => as.currencyCode === currencyCode)
        if (typeof tmpCurrency === 'undefined') {
            tmpCurrency = JSON.parse(JSON.stringify(BlocksoftDict.Currencies[currencyCode]))
            tmpCurrency.isHidden = null
            notAddedAssets.push(tmpCurrency)
        }
    })
    const fullData = [...assets, ...notAddedAssets]
    let data = []

    if (searchQuery) data = filterBySearchQuery(fullData, searchQuery)

    if (activeTab.group === ASSESTS_GROUP.ALL && !searchQuery) data = fullData

    if (activeTab.group === ASSESTS_GROUP.COINS && !searchQuery) data = fullData.filter(as => as.currencyType === 'coin')

    if (activeTab.group === ASSESTS_GROUP.TOKENS && !searchQuery) {
        const dataGrouped = fullData.reduce((grouped, asset) => {
            if (asset.currencyType !== 'token') return grouped
            if (!grouped[asset.tokenBlockchain]) grouped[asset.tokenBlockchain] = []
            grouped[asset.tokenBlockchain].push(asset)
            return grouped
        }, {})

        _forEach(dataGrouped, (arr, tokenBlockchain) => {
            data.push({
                title: tokenBlockchain,
                data: arr
            })
        })
    }

    this.setState(() => ({ data, tabs: newTabs, searchQuery }))
}

function filterBySearchQuery(assets, value) {
    value = value.toLowerCase()
    return assets.filter(as => (
        as.currencySymbol.toLowerCase().includes(value)
        || as.currencyName.toLowerCase().includes(value)
    ))
}


export async function addCustomToken(tokenAddress) {
    const tokenType = tokenAddress.substr(0, 2) === '0x' ? 'ETH_ERC_20' : 'TRX' // more logic - into validation of input is enough

    Log.log('AddCustomTokenScreen.addToken start adding ' + tokenAddress + ' ' + tokenType)

    setLoaderStatus(true)

    let checked
    try {
        checked = await customCurrencyActions.checkCustomCurrency({
            tokenType,
            tokenAddress
        })

        Log.log('AddCustomTokenScreen.addToken checked ' + tokenAddress + ' ' + tokenType + ' result ' + JSON.stringify(checked))

        if (!checked) {
            showModal({
                type: 'INFO_MODAL',
                icon: 'INFO',
                title: strings('modal.infoAddCustomAssetModal.error.title'),
                description: strings('modal.infoAddCustomAssetModal.error.description')
            })

            setLoaderStatus(false)

            return
        }


    } catch (e) {

        Log.log('AddCustomTokenScreen.addToken checked' + tokenAddress + ' ' + tokenType + ' error ' + e.message)

        showModal({
            type: 'INFO_MODAL',
            icon: 'INFO',
            title: strings('modal.infoAddCustomAssetModal.catch.title'),
            description: e.message.indexOf('SERVER_RESPONSE_') === -1 ? strings('modal.infoAddCustomAssetModal.catch.description') : strings('send.errors.' + e.message)
        })

        setLoaderStatus(false)

        return
    }


    if (BlocksoftDict.Currencies['CUSTOM_' + checked.currencyCode]) {

        showModal({
            type: 'INFO_MODAL',
            icon: 'INFO',
            title: strings('modal.infoAddCustomAssetModal.attention.title'),
            description: strings('modal.infoAddCustomAssetModal.attention.description')
        })

        setLoaderStatus(false)

        return
    }

    // @misha - i think here some info window to confirm add could be added
    await customCurrencyActions.addCustomCurrency({
        currencyCode: checked.currencyCode,
        currencyName: checked.currencyName,
        tokenType: checked.tokenType,
        tokenAddress: checked.tokenAddress,
        tokenDecimals: checked.tokenDecimals
    })

    await customCurrencyActions.importCustomCurrenciesToDict()

    try {
        await currencyActions.addCurrency({ currencyCode: 'CUSTOM_' + checked.currencyCode })
    } catch (e) {
        Log.log('AddCustomTokenScreen.addToken secondStep error ' + e.message)
    }

    try {
        await currencyActions.setCryptoCurrencies()
    } catch (e) {
        Log.log('AddCustomTokenScreen.addToken thirdStep error ' + e.message)
    }

    setLoaderStatus(false)

    showModal({
        type: 'INFO_MODAL',
        icon: true,
        title: strings('modal.infoAddCustomAssetModal.success.title'),
        description: strings('modal.infoAddCustomAssetModal.success.description')
    }, () => {
        NavStore.reset('DashboardStack')
    })
}
