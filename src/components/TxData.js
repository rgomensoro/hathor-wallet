/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import $ from 'jquery';
import { CopyToClipboard } from 'react-copy-to-clipboard';
import { Link } from 'react-router-dom'
import HathorAlert from './HathorAlert';
import ModalUnregisteredTokenInfo from './ModalUnregisteredTokenInfo';
import { selectToken } from '../actions/index';
import { connect } from "react-redux";
import Viz from 'viz.js';
import { Module, render } from 'viz.js/full.render.js';
import hathorLib from '@hathor/wallet-lib';
import { MAX_GRAPH_LEVEL } from '../constants';


const mapStateToProps = (state) => {
  return { tokens: state.tokens };
};

const mapDispatchToProps = dispatch => {
  return {
    selectToken: data => dispatch(selectToken(data)),
  };
};


/**
 * Component that renders data of a transaction (used in TransactionDetail and DecodeTx screens)
 *
 * @memberof Components
 */
class TxData extends React.Component {
  /**
   * raw {boolean} if should show raw transaction
   * children {boolean} if should show children (default is hidden but user can show with a click)
   * tokens {Array} tokens contained in this transaction
   * tokenClicked {Object} token clicked to be sent as props to the modal of unregistered token info
   */
  state = {
    raw: false,
    children: false,
    tokens: [],
    tokenClicked: null,
  };

  // Array of token uid that was already found to show the symbol
  tokensFound = [];

  componentDidMount = () => {
    this.calculateTokens();
    this.updateGraphs();
  }

  componentDidUpdate = (prevProps) => {
    if (prevProps.transaction !== this.props.transaction) {
      this.calculateTokens();
      this.updateGraphs();
    }
  }

  /**
   * Returns the url to get the graph for each type
   *
   * @param {string} hash ID of the transaction to get the graph
   * @param {string} type Type of graph to be returned (funds or verification)
   */
  graphURL = (hash, type) => {
    return `${hathorLib.helpers.getServerURL()}graphviz/neighbours.dot/?tx=${hash}&graph_type=${type}&max_level=${MAX_GRAPH_LEVEL}`;
  }

  /**
   * Update graphs on the screen to add the ones from the server
   */
  updateGraphs = () => {
    const viz = new Viz({ Module, render });
    const url1 = this.graphURL(this.props.transaction.hash, 'funds');
    const url2 = this.graphURL(this.props.transaction.hash, 'verification');
    hathorLib.txApi.getGraphviz(url1, (response) => {
      viz.renderSVGElement(response).then((element) => {
        document.getElementById('graph-funds').appendChild(element);
      });
    });

    hathorLib.txApi.getGraphviz(url2, (response) => {
      viz.renderSVGElement(response).then((element) => {
        document.getElementById('graph-verification').appendChild(element);
      });
    });
  }

  /**
   * Add all tokens of this transaction (inputs and outputs) to the state
   */
  calculateTokens = () => {
    // Adding transactions tokens to state

    const tokens = [];

    for (const output of this.props.transaction.outputs) {
      const tokenData = this.checkToken(hathorLib.wallet.getTokenIndex(output.decoded.token_data));

      if (tokenData) {
        tokens.push(tokenData);
      }
    }

    for (const input of this.props.transaction.inputs) {
      const tokenData = this.checkToken(hathorLib.wallet.getTokenIndex(input.decoded.token_data));

      if (tokenData) {
        tokens.push(tokenData);
      }
    }

    this.setState({ tokens });
  }

  /**
   * Checks if token was already added and if it's a known token, then add it
   *
   * @param {number} tokenData Represents the index of the token in this transaction
   * @return {Object} Token config object with {uid, name, symbol, tokenUnknown}
   */
  checkToken = (tokenData) => {
    if (tokenData === hathorLib.constants.HATHOR_TOKEN_INDEX) {
      return null;
    }

    const tokenConfig = this.props.transaction.tokens[tokenData - 1];

    if (this.tokensFound.find((uid) => uid === tokenConfig.uid) !== undefined) {
      // Already found this token
      return null;
    }

    const tokenUnknown = this.props.tokens.find((token) => token.uid === tokenConfig.uid) === undefined;
    this.tokensFound.push(tokenConfig.uid);
    const configToAdd = Object.assign({ unknown: tokenUnknown }, tokenConfig);
    return configToAdd;
  }

  /**
   * Show/hide raw transaction in hexadecimal
   *
   * @param {Object} e Event emitted when clicking link
   */
  toggleRaw = (e) => {
    e.preventDefault();
    this.setState({ raw: !this.state.raw }, () => {
      if (this.state.raw) {
        $(this.refs.rawTx).show(300);
      } else {
        $(this.refs.rawTx).hide(300);
      }
    });
  }

  /**
   * Show/hide children of the transaction
   *
   * @param {Object} e Event emitted when clicking link
   */
  toggleChildren = (e) => {
    e.preventDefault();
    this.setState({ children: !this.state.children });
  }

  /**
   * Method called on copy to clipboard success  
   * Show alert success message
   *
   * @param {string} text Text copied to clipboard
   * @param {*} result Null in case of error
   */
  copied = (text, result) => {
    if (result) {
      // If copied with success
      this.refs.alertCopied.show(1000);
    }
  }

  /**
   * Get token config of token from an output gettings its UID from tokenData
   *
   * @param {number} tokenData
   *
   * @return {Object} Token config data {name, symbol, uid}
   */
  getOutputToken = (tokenData) => {
    if (tokenData === hathorLib.constants.HATHOR_TOKEN_INDEX) {
      return hathorLib.constants.HATHOR_TOKEN_CONFIG;
    }
    const tokenConfig = this.props.transaction.tokens[tokenData - 1];
    return tokenConfig;
  }

  /**
   * Get symbol of token from UID iterating through possible tokens in the transaction
   *
   * @param {string} uid UID of token to get the symbol
   *
   * @return {string} Token symbol
   */
  getSymbol = (uid) => {
    if (uid === hathorLib.constants.HATHOR_TOKEN_CONFIG.uid) {
      return hathorLib.constants.HATHOR_TOKEN_CONFIG.symbol;
    }
    const tokenConfig = this.props.transaction.tokens.find((token) => token.uid === uid);
    if (tokenConfig === undefined) return '';
    return tokenConfig.symbol;
  }

  /**
   * Returns if the token from uid in parameter is not registered in the wallet
   *
   * @param {string} uid UID of the token to check
   *
   * @return {boolean} If token is unknown (not registered)
   */
  isTokenUnknown = (uid) => {
    const tokenConfig = this.state.tokens.find((token) => token.uid === uid);
    if (tokenConfig === undefined) return false;
    return tokenConfig.unknown;
  }

  /**
   * Open modal to show unregistered token info
   *
   * @param {Object} e Event emitted when clicking link
   * @param {Object} token Data of token to show info {name, symbol, uid}
   */
  showUnregisteredTokenInfo = (e, token) => {
    e.preventDefault();
    this.setState({ tokenClicked: token }, () => {
      $('#unregisteredTokenInfoModal').modal('show');
    });
  }

  /*
   * Method executed when uid of registered token is clicked
   *
   * @param {Object} e Event emitted when clicking link
   * @param {Object} token Data of token to show info {name, symbol, uid}
   */
  registeredTokenClicked = (e, token) => {
    e.preventDefault();
    this.tokenRegistered(token);
  }

  /*
   * Set token as selected in redux and redirect to /wallet/
   *
   * @param {Object} token Data of token to show info {name, symbol, uid}
   */
  tokenRegistered = (token) => {
    this.props.selectToken(token.uid);
    this.props.history.push('/wallet/');
  }

  render() {
    const renderBlockOrTransaction = () => {
      if (hathorLib.helpers.isBlock(this.props.transaction)) {
        return 'block';
      } else {
        return 'transaction';
      }
    }

    const renderInputs = (inputs) => {
      return inputs.map((input, idx) => {
        return (
          <div key={`${input.tx_id}${input.index}`}>
            <Link to={`/transaction/${input.tx_id}`}>{hathorLib.helpers.getShortHash(input.tx_id)}</Link> ({input.index}) {input.decoded && hathorLib.wallet.isAddressMine(input.decoded.address) && renderAddressBadge()}
            {renderOutput(input, 0, false)}
          </div>
        );
      });
    }

    const outputValue = (output) => {
      if (hathorLib.wallet.isAuthorityOutput(output)) {
        if (hathorLib.wallet.isMintOutput(output)) {
          return 'Mint authority';
        } else if (hathorLib.wallet.isMeltOutput(output)) {
          return 'Melt authority';
        } else {
          // Should never come here
          return 'Unknown authority';
        }
      } else {
        return hathorLib.helpers.prettyValue(output.value);
      }
    }

    const renderUnregisteredIcon = () => {
      return <i title='This token is not registered in your wallet.' className='fa text-warning fa-warning'></i>;
    }

    const renderOutputToken = (output) => {
      const tokenOutput = this.getOutputToken(hathorLib.wallet.getTokenIndex(output.decoded.token_data));
      return (
        <strong>{tokenOutput.symbol} {this.isTokenUnknown(tokenOutput.uid) && renderUnregisteredIcon()}</strong>
      );
    }

    const renderOutput = (output, idx, addBadge) => {
      return (
        <div key={idx}>
          <div>{outputValue(output)} {renderOutputToken(output)} {output.decoded && addBadge && hathorLib.wallet.isAddressMine(output.decoded.address) && renderAddressBadge()}</div>
          <div>
            {output.decoded ? renderDecodedScript(output.decoded) : `${output.script} (unknown script)` }
            {idx in this.props.spentOutputs ? <span> (<Link to={`/transaction/${this.props.spentOutputs[idx]}`}>Spent</Link>)</span> : ''}
          </div>
        </div>
      );
    }

    const renderOutputs = (outputs) => {
      return outputs.map((output, idx) => {
        return renderOutput(output, idx, true);
      });
    }

    const renderDecodedScript = (decoded) => {
      switch (decoded.type) {
        case 'P2PKH':
        case 'MultiSig':
          return renderP2PKHorMultiSig(decoded);
        case 'NanoContractMatchValues':
          return renderNanoContractMatchValues(decoded);
        default:
          return 'Unable to decode';
      }
    }

    const renderP2PKHorMultiSig = (decoded) => {
      var ret = decoded.address;
      if (decoded.timelock) {
        ret = `${ret} | Locked until ${hathorLib.dateFormatter.parseTimestamp(decoded.timelock)}`
      }
      ret = `${ret} [${decoded.type}]`;
      return ret;
    }

    const renderNanoContractMatchValues = (decoded) => {
      const ret = `Match values (nano contract), oracle id: ${decoded.oracle_data_id} hash: ${decoded.oracle_pubkey_hash}`;
      return ret;
    }

    const renderListWithLinks = (hashes, textDark) => {
      if (hashes.length === 0) {
        return;
      }
      if (hashes.length === 1) {
        const h = hashes[0];
        return <Link className={textDark ? "text-dark" : ""} to={`/transaction/${h}`}> {h} {h === this.props.transaction.hash && ' (Current transaction)'}</Link>;
      }
      const v = hashes.map((h) => <li key={h}><Link className={textDark ? "text-dark" : ""} to={`/transaction/${h}`}>{h} {h === this.props.transaction.hash && ' (Current transaction)'}</Link></li>)
      return (<ul>
        {v}
      </ul>)
    }

    const renderDivList = (hashes) => {
      return hashes.map((h) => <div key={h}><Link to={`/transaction/${h}`}>{hathorLib.helpers.getShortHash(h)}</Link></div>)
    }

    const renderTwins = () => {
      if (!this.props.meta.twins.length) {
        return;
      } else {
        return <div>This transaction has twin {hathorLib.helpers.plural(this.props.meta.twins.length, 'transaction', 'transactions')}: {renderListWithLinks(this.props.meta.twins, true)}</div>
      }
    }

    const renderConflicts = () => {
      let twins = this.props.meta.twins;
      let conflictNotTwin = this.props.meta.conflict_with.length ?
                            this.props.meta.conflict_with.filter(hash => twins.indexOf(hash) < 0) :
                            []
      if (!this.props.meta.voided_by.length) {
        if (!this.props.meta.conflict_with.length) {
          // there are conflicts, but it is not voided
          return (
            <div className="alert alert-success">
              <h4 className="alert-heading mb-0">This {renderBlockOrTransaction()} is valid.</h4>
            </div>
          )
        }

        if (this.props.meta.conflict_with.length) {
          // there are conflicts, but it is not voided
          return (
            <div className="alert alert-success">
              <h4 className="alert-heading">This {renderBlockOrTransaction()} is valid.</h4>
              <p>
                Although there is a double-spending transaction, this transaction has the highest accumulated weight and is valid.
              </p>
              <hr />
              {conflictNotTwin.length > 0 &&
                <div className="mb-0">
                  <span>Transactions double spending the same outputs as this transaction: </span>
                  {renderListWithLinks(conflictNotTwin, true)}
                </div>}
              {renderTwins()}
            </div>
          );
        }
        return;
      }

      if (!this.props.meta.conflict_with.length) {
        // it is voided, but there is no conflict
        return (
          <div className="alert alert-danger">
            <h4 className="alert-heading">This {renderBlockOrTransaction()} is voided and <strong>NOT</strong> valid.</h4>
            <p>
              This {renderBlockOrTransaction()} is verifying (directly or indirectly) a voided double-spending transaction, hence it is voided as well.
            </p>
            <div className="mb-0">
              <span>This {renderBlockOrTransaction()} is voided because of these transactions: </span>
              {renderListWithLinks(this.props.meta.voided_by, true)}
            </div>
          </div>
        )
      }

      // it is voided, and there is a conflict
      return (
        <div className="alert alert-danger">
          <h4 className="alert-heading">This {renderBlockOrTransaction()} is <strong>NOT</strong> valid.</h4>
          <div>
            <span>It is voided by: </span>
            {renderListWithLinks(this.props.meta.voided_by, true)}
          </div>
          <hr />
          {conflictNotTwin.length > 0 &&
            <div className="mb-0">
              <span>Conflicts with: </span>
              {renderListWithLinks(conflictNotTwin, true)}
            </div>}
          {renderTwins()}
        </div>
      )
    }

    const renderGraph = (label, type) => {
      return (
        <div className="mt-3 graph-div" id={`graph-${type}`} key={`graph-${type}-${this.props.transaction.hash}`}>
          <label className="graph-label">{label}:</label>
        </div>
      );
    }

    const renderAccumulatedWeight = () => {
      if (this.props.confirmationData) {
        let acc = hathorLib.helpers.roundFloat(this.props.confirmationData.accumulated_weight);
        if (this.props.confirmationData.accumulated_bigger) {
          return `Over ${acc}`;
        } else {
          return acc;
        }
      } else {
        return 'Retrieving accumulated weight data...';
      }
    }

    const renderScore = () => {
      return (
        <div>
          <label>Score:</label> {hathorLib.helpers.roundFloat(this.props.meta.score)}
        </div>
      );
    }

    const renderTokenList = () => {
      const renderTokenUID = (token) => {
        if (token.uid === hathorLib.constants.HATHOR_TOKEN_CONFIG.uid) {
          return token.uid;
        } else if (token.unknown) {
          return <a href="true" onClick={(e) => this.showUnregisteredTokenInfo(e, token)}>{token.uid}</a>
        } else {
          return <a href="true" onClick={(e) => this.registeredTokenClicked(e, token)}>{token.uid}</a>
        }
      }
      const tokens = this.state.tokens.map((token) => {
        return (
          <div key={token.uid}>
            <span>{token.name} <strong>({token.symbol})</strong> {token.unknown && renderUnregisteredIcon()} | {renderTokenUID(token)}</span>
          </div>
        );
      });
      return (
        <div className="d-flex flex-column align-items-start mb-3 common-div bordered-wrapper">
          <div><label>Tokens:</label></div>
          {tokens}
        </div>
      );
    }

    const renderFirstBlock = () => {
      return (
         <Link to={`/transaction/${this.props.meta.first_block}`}> {hathorLib.helpers.getShortHash(this.props.meta.first_block)}</Link>
      );
    }

    const renderAddressBadge = () => {
      return (
        <span className='address-badge'> Your address </span>
      )
    }

    const renderBalanceData = (balance) => {
      return Object.keys(balance).map((token) => {
        if (balance[token] > 0) {
          return (
            <div key={token}>
              <span className='received-value'><strong>{this.getSymbol(token)}: </strong> Received <i className='fa ml-2 mr-2 fa-long-arrow-down'></i> {hathorLib.helpers.prettyValue(balance[token])}</span>
            </div>
          )
        } else {
          return (
            <div key={token}>
              <span className='sent-value'><strong>{this.getSymbol(token)}: </strong> Sent <i className='fa ml-2 mr-2 fa-long-arrow-up'></i> {hathorLib.helpers.prettyValue(balance[token])}</span>
            </div>
          );
        }
      });
    }

    const renderBalance = () => {
      const balance = hathorLib.wallet.getTxBalance(this.props.transaction);
      if (Object.keys(balance).length === 0) return null;

      // If all balances are 0, we return null
      let only0 = true;
      for (const key in balance) {
        if (balance[key] !== 0) {
          only0 = false;
          break;
        }
      }

      if (only0) return null;

      return (
        <div className="d-flex flex-column common-div bordered-wrapper mt-3">
          <div><label>Balance:</label></div>
          {renderBalanceData(balance)}
        </div>
      );
    }

    const renderFirstBlockDiv = () => {
      return (
        <div>
          <label>First block:</label>
          {this.props.meta.first_block && renderFirstBlock()}
        </div>
      );
    }

    const renderAccWeightDiv = () => {
      return (
        <div>
          <label>Accumulated weight:</label>
          {renderAccumulatedWeight()}
        </div>
      );
    }

    const renderConfirmationLevel = () => {
      return (
        <div>
          <label>Confirmation level:</label>
          {this.props.confirmationData ? `${hathorLib.helpers.roundFloat(this.props.confirmationData.confirmation_level * 100)}%` : 'Retrieving confirmation level data...'}
        </div>
      );
    }

    const loadTxData = () => {
      return (
        <div className="tx-data-wrapper">
          {this.props.showConflicts ? renderConflicts() : ''}
          <div><label>{hathorLib.helpers.isBlock(this.props.transaction) ? 'Block' : 'Transaction'} ID:</label> {this.props.transaction.hash}</div>
          {renderBalance()}
          <div className="d-flex flex-row align-items-start mt-3 mb-3">
            <div className="d-flex flex-column align-items-start common-div bordered-wrapper mr-3">
              <div><label>Type:</label> {hathorLib.helpers.getTxType(this.props.transaction)}</div>
              <div><label>Time:</label> {hathorLib.dateFormatter.parseTimestamp(this.props.transaction.timestamp)}</div>
              <div><label>Nonce:</label> {this.props.transaction.nonce}</div>
              <div><label>Weight:</label> {hathorLib.helpers.roundFloat(this.props.transaction.weight)}</div>
              {!hathorLib.helpers.isBlock(this.props.transaction) && renderFirstBlockDiv()}
            </div>
            <div className="d-flex flex-column align-items-center important-div bordered-wrapper">
              {hathorLib.helpers.isBlock(this.props.transaction) && renderScore()}
              {!hathorLib.helpers.isBlock(this.props.transaction) && renderAccWeightDiv()}
              {!hathorLib.helpers.isBlock(this.props.transaction) && renderConfirmationLevel()}
            </div>
          </div>
          <div className="d-flex flex-row align-items-start mb-3">
            <div className="f-flex flex-column align-items-start common-div bordered-wrapper mr-3">
              <div><label>Inputs:</label></div>
              {renderInputs(this.props.transaction.inputs)}
            </div>
            <div className="d-flex flex-column align-items-center common-div bordered-wrapper">
              <div><label>Outputs:</label></div>
              {renderOutputs(this.props.transaction.outputs)}
            </div>
          </div>
          {this.state.tokens.length > 0 && renderTokenList()}
          <div className="d-flex flex-row align-items-start mb-3">
            <div className="f-flex flex-column align-items-start common-div bordered-wrapper mr-3">
              <div><label>Parents:</label></div>
              {renderDivList(this.props.transaction.parents)}
            </div>
            <div className="f-flex flex-column align-items-start common-div bordered-wrapper mr-3">
              <div><label>Children: </label>{this.props.meta.children.length > 0 && <a href="true" className="ml-1" onClick={(e) => this.toggleChildren(e)}>{this.state.children ? 'Click to hide' : 'Click to show'}</a>}</div>
              {this.state.children && renderDivList(this.props.meta.children)}
            </div>
          </div>
          <div className="d-flex flex-row align-items-start mb-3 common-div bordered-wrapper">
            {this.props.showGraphs && renderGraph('Verification neighbors', 'verification')}
          </div>
          <div className="d-flex flex-row align-items-start mb-3 common-div bordered-wrapper">
            {this.props.showGraphs && renderGraph('Funds neighbors', 'funds')}
          </div>
          <div className="d-flex flex-row align-items-start mb-3 common-div bordered-wrapper">
            {this.props.showRaw ? showRawWrapper() : null}
          </div>
        </div>
      );
    }

    const showRawWrapper = () => {
      return (
        <div className="mt-3 mb-3">
          <a href="true" onClick={(e) => this.toggleRaw(e)}>{this.state.raw ? 'Hide raw transaction' : 'Show raw transaction'}</a>
          {this.state.raw ?
            <CopyToClipboard text={this.props.transaction.raw} onCopy={this.copied}>
              <i className="fa fa-clone pointer ml-1" title="Copy raw tx to clipboard"></i>
            </CopyToClipboard>
          : null}
          <p className="mt-3" ref="rawTx" style={{display: 'none'}}>{this.props.transaction.raw}</p>
        </div>
      );
    }

    return (
      <div>
        {loadTxData()}
        <HathorAlert ref="alertCopied" text="Copied to clipboard!" type="success" />
        <ModalUnregisteredTokenInfo token={this.state.tokenClicked} tokenRegistered={this.tokenRegistered} />
      </div>
    );
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(TxData);
