/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import { t } from 'ttag';
import $ from 'jquery';
import hathorLib from '@hathor/wallet-lib';
import TokenAction from './TokenAction';
import tokens from '../../utils/tokens';


/**
 * Component that renders the mint form in the token detail screen
 *
 * @memberof Components
 */
class TokenMint extends React.Component {
  constructor(props) {
    super(props);

    // Reference to create another mint checkbox
    this.createAnother = React.createRef();
    // Reference to choose address automatically checkbox
    this.chooseAddress = React.createRef();
    // Reference to address input
    this.address = React.createRef();
    // Reference to address input wrapper (to show/hide it)
    this.addressWrapper = React.createRef();

    /**
     * amount {number} Amount of tokens to create
     */
    this.state = { amount: null };
  }

  /**
   * Execute mint method after form validation
   *
   * @param {string} pin PIN user wrote on modal
   *
   * @return {Object} Object with promise and success message to be shown
   */
  executeMint = (pin) => {
    const amountValue = this.state.amount*(10**hathorLib.constants.DECIMAL_PLACES);
    const output = this.props.mintOutputs[0];
    const address = this.chooseAddress.current.checked ? hathorLib.wallet.getAddressToUse() : this.address.current.value;
    const promise = hathorLib.tokens.mintTokens(
      {tx_id: output.tx_id, index: output.index, address: output.decoded.address},
      this.props.token.uid,
      address,
      amountValue,
      null,
      pin,
      {
        createAnotherMint: this.createAnother.current.checked
      }
    );
    const prettyAmountValue = hathorLib.helpers.prettyValue(amountValue);
    return { promise, message: t`${prettyAmountValue} ${this.props.token.symbol} minted!` };
  }

  /**
   * Method executed after user clicks on mint button. Validates the form.
   *
   * @return {string} Error message, in case of form invalid. Nothing, otherwise.
   */
  mint = () => {
    if (this.chooseAddress.current.checked === false && this.address.current.value === '') {
      return t`Address is required when not selected automatically`;
    }
  }

  /**
   * Shows/hides address field depending on the checkbox click
   *
   * @param {Object} e Event for the address checkbox input change
   */
  handleCheckboxAddress = (e) => {
    const value = e.target.checked;
    if (value) {
      $(this.addressWrapper.current).hide(400);
    } else {
      $(this.addressWrapper.current).show(400);
    }
  }

  /**
   * Handles amount input change
   */
  onAmountChange = (e) => {
    this.setState({amount: e.target.value});
  }

  render() {
    const renderMintAddress = () => {
      return (
        <div className="d-flex flex-row align-items-center justify-content-start col-12 mb-3">
          <div className="d-flex flex-row align-items-center address-checkbox">
            <div className="form-check">
              <input className="form-check-input" type="checkbox" ref={this.chooseAddress} id="autoselectAddress" defaultChecked={true} onChange={this.handleCheckboxAddress} />
              <label className="form-check-label" htmlFor="autoselectAddress">
                {t`Automatically select address to receive new tokens`}
              </label>
            </div>
          </div>
          <div className="form-group col-6" ref={this.addressWrapper} style={{display: 'none'}}>
            <label>Destination address</label>
            <input ref={this.address} type="text" placeholder={t`Address`} className="form-control" />
          </div>
        </div>
      );
    }

    const renderForm = () => {
      return (
        <div>
          <div className="row">
            <div className="form-group col-3">
              <label>Amount</label>
              <input
               required
               type="number"
               className="form-control"
               onChange={this.onAmountChange}
               value={this.state.amount || ''}
               step={hathorLib.helpers.prettyValue(1)}
               min={hathorLib.helpers.prettyValue(1)}
               placeholder={hathorLib.helpers.prettyValue(0)}
              />
            </div>
            {renderMintAddress()}
          </div>
          <div className="form-group d-flex flex-row align-items-center">
            <div className="form-check">
              <input className="form-check-input" type="checkbox" ref={this.createAnother} id="keepMint" defaultChecked={true} />
              <label className="form-check-label" htmlFor="keepMint">
                {t`Create another mint output for you?`}
              </label>
              <p className="subtitle">{t`Leave it checked unless you know what you are doing`}</p>
            </div>
          </div>
        </div>
      )
    }

    return (
      <TokenAction
       renderForm={renderForm}
       title='Mint tokens'
       subtitle={`A deposit of ${hathorLib.tokens.getDepositPercentage() * 100}% in HTR of the mint amount is required`}
       deposit={`Deposit: ${tokens.getDepositAmount(this.state.amount)} HTR (${hathorLib.helpers.prettyValue(this.props.htrBalance)} HTR available)`}
       buttonName='Go'
       validateForm={this.mint}
       onPinSuccess={this.executeMint}
       {...this.props}
      />
    )
  }
}

export default TokenMint;
