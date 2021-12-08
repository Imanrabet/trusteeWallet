/**
 * @version 0.43
 * @author Vadym
 */

import React, { PureComponent } from 'react'
import {
    View,
    TouchableOpacity,
    Text,
    StyleSheet,
    Platform
} from 'react-native'
import { connect } from 'react-redux'

import ScreenWrapper from '@app/components/elements/ScreenWrapper'
import NavStore from '@app/components/navigation/NavStore'

import { ThemeContext } from '@app/theme/ThemeProvider'
import Tabs from '@app/components/elements/new/TabsWithUnderline'
import { TabView } from 'react-native-tab-view'
import Account from '@app/appstores/DataSource/Account/Account'

import { getSelectedAccountData, getSelectedWalletData, getSelectedCryptoCurrencyData } from '@app/appstores/Stores/Main/selectors'
import { getIsBalanceVisible, getIsSegwit } from '@app/appstores/Stores/Settings/selectors'
import BorderedButton from '@app/components/elements/new/buttons/BorderedButton'
import { strings } from '@app/services/i18n'
import BlocksoftPrettyNumbers from '@crypto/common/BlocksoftPrettyNumbers'
import { changeAddress, getAddress } from './helpers'

import LetterSpacing from '@app/components/elements/LetterSpacing'
import Loader from '@app/components/elements/LoaderItem'
import AccountGradientBlock from '../elements/AccountGradientBlock'
import { ScrollView } from 'react-native-gesture-handler'
import HdAddressListItem from './elements/HdAddressListItem'

class AllAddressesScreen extends PureComponent {

    state = {
        settingAddressType: false,
        settingAddressTypeTriggered : false,
        isBalanceVisibleTriggered: false,
        isBalanceVisible: true,
        routes: [
            {
                title: 'SEGWIT',
                key: 'first'
            },
            {
                title: 'LEGACY',
                key: 'second'
            }
        ],
        index: 0,
        segwitAddresses: [],
        legacyAddresses: [],
        loading: false
    }

    componentDidMount() {
        this.setState({loading: true})
        this.loadAddresses()
        this.setState({loading: false})
    }

    handleClose = () => {
        NavStore.reset()
    }

    handleBack = () => {
        NavStore.goBack()
    }

    handleGetAddress = () => {
        getAddress.call(this)
    }

    handleChangeAddress = async () => {
        await changeAddress.call(this)
    }

    // componentDidUpdate(prevProps, prevState, snapshot) {
        
    // }

    loadAddresses = async () => {

        const { currencyCode, walletHash } = this.props.selectedAccountData
        // const { walletIsHd } = this.props.selectedWalletData

        // console.log(`walletHash`, walletHash)
        // console.log(`currencyCode`, currencyCode)
        // console.log(`walletIsHd`, walletIsHd)
        // console.log(`derivationPath`, derivationPath)
        // console.log(`walletPubs`, walletPubs)

        const params = {
            // notAlreadyShown: walletIsHd,
            walletHash: walletHash,
            currencyCode: currencyCode,
            splitSegwit: true
        }

        const tmp = await Account.getAccountData(params)
        
        this.setState({
            segwitAddresses: tmp.segwit,
            legacyAddresses: tmp.legacy
            
        })
    }

    triggerBalanceVisibility = (value, originalVisibility) => {
        this.setState((state) => ({ isBalanceVisible: value || originalVisibility, isBalanceVisibleTriggered: true }))
    }

    renderHeader = () => {

        const { originalVisibility } = this.props
        const { isBalanceVisible, isBalanceVisibleTriggered } = this.state
        const finalIsBalanceVisible = isBalanceVisibleTriggered ? isBalanceVisible : originalVisibility

        const { isSynchronized, balancePretty, basicCurrencySymbol, basicCurrencyBalance, currencyCode } = this.props.selectedAccountData

        const { colors } = this.context

        let tmp = BlocksoftPrettyNumbers.makeCut(balancePretty, 7, 'AccountScreen/renderBalance').separated
        if (typeof tmp.split === 'undefined') {
            throw new Error('AccountScreen.renderBalance split is undefined')
        }

        tmp = tmp.slice(0, 11)
        const tmps = tmp.split('.')
        let balancePrettyPrep1 = tmps[0]
        let balancePrettyPrep2 = ''
        if (typeof tmps[1] !== 'undefined' && tmps[1]) {
            balancePrettyPrep1 = tmps[0] + '.'
            balancePrettyPrep2 = tmps[1]
        }

        return(
            <AccountGradientBlock>
                <View style={styles.headerContainer}>
                    <Text style={[styles.headerTitle, { color: colors.common.text1 }]}>{strings('FioRequestDetails.balance')}</Text>
                    <BorderedButton
                        text={strings('settings.walletList.generateNew')}
                        onPress={this.handleChangeAddress}
                        activeOpacity={0.8}
                    />
                </View>
                {isSynchronized ?
                    <View style={{ ...styles.topContent__top }}>
                        <View style={{ ...styles.topContent__title, flex: 1 }}>
                            <TouchableOpacity
                                onPressIn={() => this.triggerBalanceVisibility(true, originalVisibility)}
                                onPressOut={() => this.triggerBalanceVisibility(false, originalVisibility)}
                                activeOpacity={1}
                                disabled={originalVisibility}
                                hitSlop={{ top: 10, right: finalIsBalanceVisible ? 60 : 30, bottom: 10, left: finalIsBalanceVisible ? 60 : 30 }}
                            >
                                {finalIsBalanceVisible ? (
                                    <Text style={{ ...styles.topContent__title_first, color: colors.common.text1 }} numberOfLines={1} >
                                        {balancePrettyPrep1}
                                        <Text style={{ ...styles.topContent__title_last, color: colors.common.text1 }}>
                                            {`${balancePrettyPrep2} ${currencyCode}`}
                                        </Text>
                                    </Text>
                                ) : (
                                    <Text style={{ ...styles.topContent__title_last, color: colors.common.text1, paddingHorizontal: 15, fontSize: 32, lineHeight: 36 }}>
                                        ****
                                    </Text>
                                )}
                            </TouchableOpacity>
                        </View>
                        {finalIsBalanceVisible && (
                            <LetterSpacing
                                text={basicCurrencySymbol + ' ' + basicCurrencyBalance}
                                textStyle={{ ...styles.topContent__subtitle, color: colors.common.text2 }}
                                letterSpacing={.5}
                            />
                        )}
                    </View> :
                    <View style={styles.topContent__top}>
                        <View style={styles.topContent__title}>
                            <View style={{ height: Platform.OS === 'ios' ? 46 : 51, alignItems: 'center' }}>
                                <Loader size={30} color={colors.accountScreen.loaderColor} />
                            </View>
                        </View>
                    </View>
                }
            </AccountGradientBlock>
        )
    }

    renderTabs = () => {
        return(
            <Tabs active={this.state.index} tabs={this.state.routes} changeTab={this.handleTabChange} />
        )
    }

    handleTabChange = index => {
        this.setState({
            index
        })
    }

    renderScene = ({ route }) => {
        switch (route.key) {
            case 'first':
                return this.renderFirstRoute()
            case 'second':
                return this.renderSecondRoute()
            default:
                return null
        }
    }

    renderFirstRoute = () => {

        const { GRID_SIZE } = this.context

        return(
            <View style={{ marginTop: GRID_SIZE / 2 }}>
                {this.state.segwitAddresses.map(e => <HdAddressListItem key={e.id} address={e.address} balance={e.balance} />)}
            </View>
        )
    }

    renderSecondRoute = () => {

        const { GRID_SIZE } = this.context

        return(
            <View style={{ marginTop: GRID_SIZE / 2 }}>
                {this.state.legacyAddresses.map(e => <HdAddressListItem key={e.id} address={e.address} balance={e.balance} />)}
            </View>
        )
    }

    render() {

        const { GRID_SIZE } = this.context

        return (
            <ScreenWrapper
                title="All addresses"
                leftType='back'
                leftAction={this.handleBack}
                rightType='close'
                rightAction={this.handleClose}
            >
                
                <View style={{ marginHorizontal: GRID_SIZE, marginTop: GRID_SIZE }}>
                    {this.renderHeader()}
                </View>
                
                <View style={{ marginHorizontal: GRID_SIZE }}>
                    {this.renderTabs()}
                </View>
                <ScrollView
                    showsVerticalScrollIndicator={false}
                >
                    <TabView
                        style={{ flexGrow: 1 }}
                        navigationState={this.state}
                        renderScene={this.renderScene}
                        renderHeader={null}
                        onIndexChange={this.handleTabChange}
                        renderTabBar={() => null}
                        useNativeDriver
                    />
               </ScrollView>
            </ScreenWrapper>
        )
    }
}

AllAddressesScreen.contextType = ThemeContext

const mapStateToProps = (state) => {
    return {
        selectedAccountData: getSelectedAccountData(state),
        selectedWalletData: getSelectedWalletData(state),
        originalVisibility: getIsBalanceVisible(state.settingsStore),
        isSegwit: getIsSegwit(state),
        selectedCryptoCurrencyData: getSelectedCryptoCurrencyData(state)
    }
}

export default connect(mapStateToProps)(AllAddressesScreen)

const styles = StyleSheet.create({
    topContent__top: {
        position: 'relative',
        alignItems: 'center',
    },
    currencyName: {
        flexDirection: 'row',
        fontFamily: 'Montserrat-SemiBold',
        fontSize: 17,
    },
    topBlock__top_bg: {
        position: 'absolute',
        top: 0,
        right: 0,
        width: '100%',
        height: 140,
    },
    topContent__title: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
        marginTop: 16,
    },
    topContent__subtitle: {
        marginTop: -20,
        fontFamily: 'SFUIDisplay-SemiBold',
        fontSize: 14,
        lineHeight: 18,
        textAlign: 'center'
    },
    topContent__title_first: {
        height: 36,
        fontSize: 32,
        fontFamily: 'Montserrat-Regular',
        lineHeight: 36,
    },
    topContent__title_last: {
        height: 36,
        fontSize: 16,
        fontFamily: 'Montserrat-SemiBold',
        lineHeight: 36,
        opacity: 1,
    },
    topContent__bottom: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: Platform.OS === 'ios' ? -20 : -30,
        overflow: 'visible'
    },
    topContent__middle: {
        flexDirection: 'row',
        paddingTop: 4,
    },
    topContent__address: {
        marginBottom: 3,
        fontFamily: 'SFUIDisplay-Bold',
        fontSize: 14,
        color: '#999999'
    },
    headerTitle: {
        fontFamily: 'Montserrat-SemiBold',
        fontSize: 18,
        lineHeight: 22
    },
    headerContainer :{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center'
    }
})
