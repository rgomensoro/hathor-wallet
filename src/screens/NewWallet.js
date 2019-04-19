/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import wallet from '../utils/wallet';
import logo from '../assets/images/hathor-logo.png';
import NewWalletStep2 from '../components/NewWalletStep2';
import ChoosePassword from '../components/ChoosePassword';
import ChoosePin from '../components/ChoosePin';
import HathorAlert from '../components/HathorAlert';
import { HD_WALLET_ENTROPY } from '../constants';
import { updatePassword, updatePin, updateWords } from '../actions/index';
import { connect } from "react-redux";


const mapDispatchToProps = dispatch => {
  return {
    updatePassword: data => dispatch(updatePassword(data)),
    updatePin: data => dispatch(updatePin(data)),
    updateWords: data => dispatch(updateWords(data)),
  };
};


const mapStateToProps = (state) => {
  return { password: state.password, pin: state.pin, words: state.words };
};


/**
 * Screen used to generate a new wallet creating new words
 * Depending on the state can show:
 * - Message with checkbox, so user can understand what the creation of words means
 * - Component with option to backup the words
 * - Choose password component
 * - Choose pin component
 *
 * @memberof Screens
 */
class NewWallet extends React.Component {
  constructor(props) {
    super(props);

    /**
     * step2 {boolean} If should show step2 component
     * askPassword {boolean} If should show password component
     * askPIN {boolean} If should show PIN component
     */
    this.state = {
      step2: false,
      askPassword: false,
      askPIN: false,
    }
  }

  componentDidMount = () => {
    wallet.markBackupAsNotDone();
  }

  create = () => {
    let isValid = this.refs.confirmForm.checkValidity();
    if (isValid) {
      this.refs.confirmForm.classList.remove('was-validated')
      const words = wallet.generateWalletWords(HD_WALLET_ENTROPY);
      this.props.updateWords(words);
      this.setState({ step2: true });
    } else {
      this.refs.confirmForm.classList.add('was-validated')
    }
  }

  /**
   * User clicked to do backup later, so shows Choose password component
   */
  backupLater = () => {
    this.setState({ askPassword: true });
  }

  /**
   * User succeded on choosing a password, then show the Choose PIN component
   */
  passwordSuccess = () => {
    this.setState({ askPIN: true });
  }

  /**
   * After choosing a new PIN with success, executes the wallet creation and redirect to the wallet
   */
  pinSuccess = () => {
    // First we clean what can still be there of a last wallet
    wallet.cleanWallet();
    // Generate addresses and load data
    wallet.executeGenerateWallet(this.props.words, '', this.props.pin, this.props.password, true);
    // Clean pin, password and words from redux
    this.props.updatePassword(null);
    this.props.updatePin(null);
    this.props.updateWords(null);
    // Go to wallet
    this.props.history.push('/wallet/');
  }

  /**
   * After user backed up the words with success we mark it as done and show the component to Choose Password
   */
  validationSuccess = () => {
    wallet.markBackupAsDone();
    this.refs.alertSuccess.show(1000);
    this.setState({ askPassword: true });
  }

  /**
   * Going back from Choose Password component to the Step2
   */
  passwordBack = () => {
    this.setState({ askPassword: false });
  }

  /**
   * Going back from Choose PIN component to Choose Password
   */
  pinBack = () => {
    this.setState({ askPIN: false });
  }

  /**
   * Going back from Step2 component to initial New Wallet component
   */
  step2Back = () => {
    this.setState({ step2: false });
  }

  render() {
    const renderStep1 = () => {
      return (
        <div>
          <p className="mt-4">. A new wallet is generated by 24 words.</p>
          <p>. To have access to this wallet you must have all the words saved in the same order we will show to you.</p>
          <p className="mb-4">. If someone manages to discover your words they can steal your tokens, so we advise you to save your words physically and don't show them to anyone.</p>
          <form ref="confirmForm" className="w-100 mb-4">
            <div className="form-check">
              <input required type="checkbox" className="form-check-input" id="confirmWallet" />
              <label className="form-check-label" htmlFor="confirmWallet" >Ok, I got it!</label>
            </div>
          </form>
          <div className="d-flex justify-content-between flex-row w-100">
            <button onClick={this.props.history.goBack} type="button" className="btn btn-secondary">Back</button>
            <button onClick={this.create} type="button" className="btn btn-hathor">Create my words</button>
          </div>
        </div>
      )
    }

    const renderMainData = () => {
      if (this.state.askPIN) {
        return <ChoosePin back={this.pinBack} success={this.pinSuccess} />;
      } else if (this.state.askPassword) {
        return <ChoosePassword back={this.passwordBack} success={this.passwordSuccess} />;
      } else if (this.state.step2) {
        return <NewWalletStep2 back={this.step2Back} backupLater={this.backupLater} validationSuccess={this.validationSuccess} />;
      } else {
        return renderStep1();
      }
    }

    return (
      <div className="outside-content-wrapper">
        <div className="inside-white-wrapper col-sm-12 col-md-8 offset-md-2 col-lg-6 offset-lg-3">
          <div className="d-flex align-items-center flex-column">
            <img className="hathor-logo" src={logo} alt="" />
            <div className="d-flex align-items-start flex-column">
              {renderMainData()}
            </div>
          </div>
        </div>
        <HathorAlert ref="alertSuccess" text="Backup completed!" type="success" />
      </div>
    )
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(NewWallet);
