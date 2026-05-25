<?php

namespace App\Support;

class DefaultChartOfAccounts
{
    /**
     * @return array<int, array{code:string, name:string, type:string, normal_balance:string, is_cash?:bool, is_system?:bool}>
     */
    public static function accounts(): array
    {
        return [
            ['code' => '1010', 'name' => 'Kas', 'type' => 'asset', 'normal_balance' => 'debit', 'is_cash' => true, 'is_system' => true],
            ['code' => '1020', 'name' => 'Bank', 'type' => 'asset', 'normal_balance' => 'debit', 'is_cash' => true, 'is_system' => true],
            ['code' => '1030', 'name' => 'Piutang Dagang', 'type' => 'asset', 'normal_balance' => 'debit', 'is_system' => true],
            ['code' => '1040', 'name' => 'Persediaan Barang Dagang', 'type' => 'asset', 'normal_balance' => 'debit', 'is_system' => true],
            ['code' => '1050', 'name' => 'Aset Tetap', 'type' => 'asset', 'normal_balance' => 'debit', 'is_system' => true],
            ['code' => '1060', 'name' => 'Akumulasi Penyusutan Aset Tetap', 'type' => 'asset', 'normal_balance' => 'credit', 'is_system' => true],
            ['code' => '2010', 'name' => 'Hutang Dagang', 'type' => 'liability', 'normal_balance' => 'credit', 'is_system' => true],
            ['code' => '2020', 'name' => 'Hutang Pajak', 'type' => 'liability', 'normal_balance' => 'credit', 'is_system' => true],
            ['code' => '1070', 'name' => 'Pajak Masukan Dibayar Dimuka', 'type' => 'asset', 'normal_balance' => 'debit', 'is_system' => true],
            ['code' => '3010', 'name' => 'Modal Pemilik', 'type' => 'equity', 'normal_balance' => 'credit', 'is_system' => true],
            ['code' => '4010', 'name' => 'Penjualan', 'type' => 'revenue', 'normal_balance' => 'credit', 'is_system' => true],
            ['code' => '4020', 'name' => 'Diskon Penjualan', 'type' => 'contra_revenue', 'normal_balance' => 'debit', 'is_system' => true],
            ['code' => '5010', 'name' => 'Harga Pokok Penjualan', 'type' => 'expense', 'normal_balance' => 'debit', 'is_system' => true],
            ['code' => '6010', 'name' => 'Beban Operasional', 'type' => 'expense', 'normal_balance' => 'debit'],
            ['code' => '6020', 'name' => 'Beban Gaji', 'type' => 'expense', 'normal_balance' => 'debit'],
            ['code' => '6030', 'name' => 'Beban Sewa', 'type' => 'expense', 'normal_balance' => 'debit'],
            ['code' => '6040', 'name' => 'Beban Listrik dan Air', 'type' => 'expense', 'normal_balance' => 'debit'],
            ['code' => '6050', 'name' => 'Beban Penyusutan', 'type' => 'expense', 'normal_balance' => 'debit', 'is_system' => true],
            ['code' => '7010', 'name' => 'Pendapatan Lain-lain', 'type' => 'revenue', 'normal_balance' => 'credit'],
        ];
    }
}
