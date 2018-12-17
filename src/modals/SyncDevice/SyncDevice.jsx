import React from 'react'
import PropTypes from 'prop-types'
import { Button, Loader } from 'qwant-research-components'

import { Modal } from '../../components'
import { ReactComponent as CheckCircle } from '../../assets/check-circle.svg'

import styles from './SyncDevice.module.scss'

class SyncDevice extends React.Component {
  copyLink () {
    const link = document.querySelector('input')
    link.select()
    document.execCommand('copy')
  }

  renderSyncLink () {
    return (
      <Modal height={370} width={511} onClose={this.props.onClose}>
        <div className={styles.SyncDevice}>
          <p className={styles.title}>Ajouter un appareil</p>
          <p className={styles.description}>
            Copiez-collez le lien suivant pour synchroniser votre profile et vos applications avec un autre appareil.
          </p>
          <input id='link' readOnly defaultValue='qwa.nt/0BJ8ZX' />
          <Button label='Copier' onClick={this.copyLink} />
        </div>
      </Modal>
    )
  }

  renderSyncLoading () {
    return (
      <Modal height={370} width={511}>
        <div className={styles.SyncDevice}>
          <p className={styles.title}>Ajouter un appareil</p>
          <p className={styles.description}>Synchronisation en cours, veuillez patienter...</p>
          <div className={styles.loader}>
            <Loader />
          </div>
        </div>
      </Modal>
    )
  }
  renderSyncComplete () {
    return (
      <Modal height={370} width={511}>
        <div className={styles.SyncDevice}>
          <CheckCircle width={160} height={160} color='#40ae6c' />
          <p className={styles.description}>Synchronisation terminée. Vous pouvez maintenant vous connecter</p>
          <Button label='OK' />
        </div>
      </Modal>
    )
  }

  render () {
    return (
      <div>
        {/* <Notification style={{ position: 'relative' }} title='Lien copié dans le presse-papier' /> */}
        {this.renderSyncLink()}
        {/* {this.renderSyncLoading()} */}
        {/* {this.renderSyncComplete()} */}
      </div>
    )
  }
}

SyncDevice.propTypes = {
  onClose: PropTypes.func.isRequired
}

export default SyncDevice
