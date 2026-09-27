'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

interface Transaction {
  id: string;
  tanggal: string;
  tipe: 'pemasukan' | 'pengeluaran';
  kategori: string;
  jumlah: number;
  kamar?: string;
  keterangan?: string;
}

export default function KosFinancialReport() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const [tanggal, setTanggal] = useState<string>(new Date().toISOString().split('T')[0]);
  const [tipe, setTipe] = useState<'pemasukan' | 'pengeluaran'>('pemasukan');
  const [kategori, setKategori] = useState<string>('Sewa Kamar Bulanan');
  const [jumlah, setJumlah] = useState<string>('');
  const [kamar, setKamar] = useState<string>('');
  const [keterangan, setKeterangan] = useState<string>('');

  const fetchTransactions = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .order('tanggal', { ascending: false });

    if (!error && data) setTransactions(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jumlah || parseFloat(jumlah) <= 0) return alert('Masukkan jumlah yang valid');

    const newTransaction = {
      tanggal,
      tipe,
      kategori,
      jumlah: parseFloat(jumlah),
      kamar: kamar || null,
      keterangan: keterangan || null,
    };

    const { error } = await supabase.from('transactions').insert([newTransaction]);

    if (error) {
      alert('Gagal menambah transaksi: ' + error.message);
    } else {
      setJumlah('');
      setKamar('');
      setKeterangan('');
      fetchTransactions();
    }
  };

  const totalPemasukan = transactions
    .filter((t) => t.tipe === 'pemasukan')
    .reduce((acc, curr) => acc + Number(curr.jumlah), 0);

  const totalPengeluaran = transactions
    .filter((t) => t.tipe === 'pengeluaran')
    .reduce((acc, curr) => acc + Number(curr.jumlah), 0);

  const saldoBersih = totalPemasukan - totalPengeluaran;

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(val);
  };

  const exportToExcel = () => {
    const dataToExport = transactions.map((t, idx) => ({
      No: idx + 1,
      Tanggal: t.tanggal,
      Jenis: t.tipe.toUpperCase(),
      Kategori: t.kategori,
      Kamar: t.kamar || '-',
      'Jumlah (Rp)': t.jumlah,
      Keterangan: t.keterangan || '-',
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Laporan Keuangan');
    XLSX.writeFile(workbook, `Laporan_Keuangan_Kos_Abu_Abu_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('LAPORAN KEUANGAN KOS ABU-ABU SURABAYA', 14, 15);
    doc.setFontSize(10);
    doc.text(`Dicetak pada: ${new Date().toLocaleDateString('id-ID')}`, 14, 22);

    doc.text(`Total Pemasukan  : Rp ${totalPemasukan.toLocaleString('id-ID')}`, 14, 30);
    doc.text(`Total Pengeluaran : Rp ${totalPengeluaran.toLocaleString('id-ID')}`, 14, 36);
    doc.text(`Saldo / Laba Bersih : Rp ${saldoBersih.toLocaleString('id-ID')}`, 14, 42);

    const tableColumn = ['Tanggal', 'Jenis', 'Kategori', 'Kamar', 'Jumlah (Rp)', 'Keterangan'];
    const tableRows = transactions.map((t) => [
      t.tanggal,
      t.tipe.toUpperCase(),
      t.kategori,
      t.kamar || '-',
      `Rp ${Number(t.jumlah).toLocaleString('id-ID')}`,
      t.keterangan || '-',
    ]);

    (doc as any).autoTable({
      startY: 48,
      head: [tableColumn],
      body: tableRows,
      theme: 'grid',
      headStyles: { fillColor: [31, 41, 55] },
    });

    doc.save(`Laporan_Keuangan_Kos_Abu_Abu_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Laporan Keuangan Kos Abu-Abu</h1>
            <p className="text-sm text-gray-500">Lokasi: Surabaya | Sistem Real-time Online</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={exportToExcel}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition"
            >
              Export Excel
            </button>
            <button
              onClick={exportToPDF}
              className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition"
            >
              Export PDF
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
            <p className="text-sm font-medium text-gray-500">Total Pemasukan</p>
            <h3 className="text-2xl font-bold text-emerald-600 mt-1">{formatRupiah(totalPemasukan)}</h3>
          </div>
          <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
            <p className="text-sm font-medium text-gray-500">Total Pengeluaran</p>
            <h3 className="text-2xl font-bold text-rose-600 mt-1">{formatRupiah(totalPengeluaran)}</h3>
          </div>
          <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
            <p className="text-sm font-medium text-gray-500">Saldo / Laba Bersih</p>
            <h3 className={`text-2xl font-bold mt-1 ${saldoBersih >= 0 ? 'text-blue-600' : 'text-rose-600'}`}>
              {formatRupiah(saldoBersih)}
            </h3>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-fit">
            <h2 className="text-lg font-bold text-gray-800 mb-4">Tambah Transaksi</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Tanggal</label>
                <input
                  type="date"
                  value={tanggal}
                  onChange={(e) => setTanggal(e.target.value)}
                  className="w-full p-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Jenis Transaksi</label>
                <select
                  value={tipe}
                  onChange={(e) => {
                    const selected = e.target.value as 'pemasukan' | 'pengeluaran';
                    setTipe(selected);
                    setKategori(selected === 'pemasukan' ? 'Sewa Kamar Bulanan' : 'Listrik & Air (PDAM Surabaya)');
                  }}
                  className="w-full p-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="pemasukan">Pemasukan (+)</option>
                  <option value="pengeluaran">Pengeluaran (-)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Kategori</label>
                <select
                  value={kategori}
                  onChange={(e) => setKategori(e.target.value)}
                  className="w-full p-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  {tipe === 'pemasukan' ? (
                    <>
                      <option value="Sewa Kamar Bulanan">Sewa Kamar Bulanan</option>
                      <option value="Deposit/Uang Muka">Deposit/Uang Muka</option>
                      <option value="Lain-Lain">Lain-Lain (Laundry/Parkir)</option>
                    </>
                  ) : (
                    <>
                      <option value="Listrik & Air (PDAM Surabaya)">Listrik & Air (PDAM Surabaya)</option>
                      <option value="Internet / WiFi">Internet / WiFi</option>
                      <option value="Iuran Kebersihan & Keamanan">Iuran Kebersihan & Keamanan</option>
                      <option value="Maintenance & Perbaikan">Maintenance & Perbaikan</option>
                      <option value="Lain-Lain">Lain-Lain</option>
                    </>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Nomor Kamar (Opsional)</label>
                <input
                  type="text"
                  placeholder="Contoh: Kamar 05"
                  value={kamar}
                  onChange={(e) => setKamar(e.target.value)}
                  className="w-full p-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Jumlah (Rp)</label>
                <input
                  type="number"
                  placeholder="0"
                  value={jumlah}
                  onChange={(e) => setJumlah(e.target.value)}
                  className="w-full p-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Keterangan</label>
                <textarea
                  placeholder="Catatan tambahan..."
                  value={keterangan}
                  onChange={(e) => setKeterangan(e.target.value)}
                  className="w-full p-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none h-20"
                ></textarea>
              </div>

              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg text-sm transition duration-200"
              >
                Simpan Transaksi
              </button>
            </form>
          </div>

          <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h2 className="text-lg font-bold text-gray-800 mb-4">Riwayat Transaksi</h2>
            {loading ? (
              <p className="text-sm text-gray-500">Memuat data...</p>
            ) : transactions.length === 0 ? (
              <p className="text-sm text-gray-500">Belum ada transaksi dicatat.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-600">
                  <thead className="bg-gray-50 text-gray-700 uppercase text-xs">
                    <tr>
                      <th className="py-3 px-4">Tanggal</th>
                      <th className="py-3 px-4">Kategori / Kamar</th>
                      <th className="py-3 px-4">Keterangan</th>
                      <th className="py-3 px-4 text-right">Jumlah</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {transactions.map((t) => (
                      <tr key={t.id} className="hover:bg-gray-50">
                        <td className="py-3 px-4 whitespace-nowrap">{t.tanggal}</td>
                        <td className="py-3 px-4">
                          <span className="font-semibold text-gray-800">{t.kategori}</span>
                          {t.kamar && <span className="block text-xs text-gray-400">{t.kamar}</span>}
                        </td>
                        <td className="py-3 px-4">{t.keterangan || '-'}</td>
                        <td className={`py-3 px-4 text-right font-medium whitespace-nowrap ${
                          t.tipe === 'pemasukan' ? 'text-emerald-600' : 'text-rose-600'
                        }`}>
                          {t.tipe === 'pemasukan' ? '+' : '-'} {formatRupiah(Number(t.jumlah))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
