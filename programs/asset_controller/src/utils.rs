use anchor_lang::{
    prelude::Result,
    solana_program::{program::invoke, system_instruction::transfer},
    Lamports,
};

use crate::{AccountInfo, Rent, SolanaSysvar};

pub fn update_account_lamports_to_minimum_balance<'info>(
    account: AccountInfo<'info>,
    payer: AccountInfo<'info>,
    system_program: AccountInfo<'info>,
) -> Result<()> {
    let min_balance = Rent::get()?.minimum_balance(account.data_len());
    if min_balance > account.get_lamports() {
        invoke(
            &transfer(payer.key, account.key, min_balance - account.get_lamports()),
            &[payer, account, system_program],
        )?;
    }
    Ok(())
}
