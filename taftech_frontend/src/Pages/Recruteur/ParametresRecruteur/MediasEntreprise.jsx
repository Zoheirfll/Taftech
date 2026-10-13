// Blocs images de l'onglet entreprise : logo, bannière, galerie photo (12 max) et QR code de la page publique.
import React from "react";
import { Building2, Upload, X, QrCode, Download } from "lucide-react";
import { QRCodeCanvas } from "qrcode.react";
import { tw } from "../../../theme";
import { mediaUrl } from "../../../utils/mediaUrl";

export const BlocLogo = ({ logoUrl, onLogoChange }) => (
  <div>
    <label className={`text-xs font-medium ${tw.textMuted700} mb-3 block`}>
      Logo de l'entreprise
    </label>
    <div className="flex items-center gap-4">
      <div className={`w-24 h-24 rounded-xl flex items-center justify-center overflow-hidden shrink-0 ${tw.readonlyFieldDashed}`}>
        {logoUrl ? (
          <img
            src={logoUrl}
            alt="Logo"
            className="w-full h-full object-cover"
          />
        ) : (
          <Building2 size={28} className={tw.textSubtle} />
        )}
      </div>
      <div>
        <label className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium cursor-pointer transition-colors ${tw.uploadLabelPill}`}>
          <Upload size={14} />
          Changer le logo
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={onLogoChange}
            className="hidden"
          />
        </label>
        <p className={`text-[10px] ${tw.textMuted} mt-1`}>
          JPG, PNG ou WEBP — 2 Mo max
        </p>
      </div>
    </div>
  </div>
);

export const BlocBanniere = ({ bannerUrl, onBannerChange }) => (
  <div>
    <label className={`text-xs font-medium ${tw.textMuted700} mb-3 block`}>
      Bannière (page vitrine)
    </label>
    <div className={`w-full h-32 rounded-xl flex items-center justify-center overflow-hidden mb-3 ${tw.readonlyFieldDashed}`}>
      {bannerUrl ? (
        <img src={bannerUrl} alt="Bannière" className="w-full h-full object-cover" />
      ) : (
        <span className={`text-xs ${tw.textSubtle}`}>Aucune bannière</span>
      )}
    </div>
    <label className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium cursor-pointer transition-colors ${tw.uploadLabelPill}`}>
      <Upload size={14} />
      Changer la bannière
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={onBannerChange}
        className="hidden"
      />
    </label>
    <p className={`text-[10px] ${tw.textMuted} mt-1`}>
      JPG, PNG ou WEBP — 5 Mo max — format large recommandé
    </p>
  </div>
);

export const BlocGaleriePhotos = ({
  photos,
  newPhotoLegende,
  setNewPhotoLegende,
  uploadingPhoto,
  onAjouterPhoto,
  onSupprimerPhoto,
}) => (
  <div className="md:col-span-2">
    <label className={`text-xs font-medium ${tw.textMuted700} mb-3 block`}>
      Galerie photo <span className={tw.textMuted}>({photos.length}/12 — bureaux, équipe, événements...)</span>
    </label>
    {photos.length > 0 && (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
        {photos.map((p) => (
          <div key={p.id} className="relative group">
            <img
              src={mediaUrl(p.image)}
              alt={p.legende || ""}
              className={`w-full h-24 object-cover rounded-lg border ${tw.borderBase}`}
            />
            <button
              type="button"
              onClick={() => onSupprimerPhoto(p.id)}
              className="absolute top-1 right-1 w-6 h-6 flex items-center justify-center rounded-full bg-slate-900/70 text-white md:opacity-0 md:group-hover:opacity-100 focus:opacity-100 transition-opacity"
              aria-label="Supprimer la photo"
              title="Supprimer la photo"
            >
              <X size={12} />
            </button>
          </div>
        ))}
      </div>
    )}
    {photos.length < 12 && (
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
        <input
          type="text"
          value={newPhotoLegende}
          onChange={(e) => setNewPhotoLegende(e.target.value)}
          placeholder="Légende (optionnel)"
          className={`w-full sm:w-56 px-3 py-2 rounded-lg text-sm ${tw.inputColorsMuted}`}
        />
        <label className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium cursor-pointer transition-colors shrink-0 ${tw.uploadLabelPill} ${uploadingPhoto ? "opacity-50 pointer-events-none" : ""}`}>
          <Upload size={14} />
          {uploadingPhoto ? "Envoi..." : "Ajouter une photo"}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={onAjouterPhoto}
            disabled={uploadingPhoto}
            className="hidden"
          />
        </label>
      </div>
    )}
    <p className={`text-[10px] ${tw.textMuted} mt-1`}>
      JPG, PNG ou WEBP — 3 Mo max par photo
    </p>
  </div>
);

export const BlocQrCode = ({ entreprise }) => (
  <div className={`border ${tw.borderBase} rounded-xl p-5 ${tw.surfaceMuted}`}>
    <div className="flex items-center gap-2 mb-4">
      <QrCode size={16} className={tw.textTeal} />
      <h3 className={`text-sm font-semibold ${tw.textStrong}`}>QR Code de votre entreprise</h3>
    </div>
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
      <div className={`p-3 ${tw.surface} rounded-xl border ${tw.borderBase} shadow-sm shrink-0`}>
        <QRCodeCanvas
          id="entreprise-qr"
          value={`${window.location.origin}/entreprise/${entreprise.slug}`}
          size={140}
          bgColor="#ffffff"
          fgColor="#0f172a"
          level="H"
          includeMargin={false}
        />
      </div>
      <div className="space-y-2">
        <p className={`text-sm ${tw.textMuted700} font-medium`}>Partagez ce QR code avec vos candidats</p>
        <p className={`text-xs ${tw.textMuted700} leading-relaxed`}>
          En le scannant, ils accèdent directement à votre page entreprise et peuvent envoyer une candidature spontanée.
        </p>
        <button
          onClick={() => {
            const canvas = document.getElementById("entreprise-qr");
            const url = canvas.toDataURL("image/png");
            const a = document.createElement("a");
            a.href = url;
            a.download = `qr-${entreprise.nom_entreprise || "entreprise"}.png`;
            a.click();
          }}
          className={`flex items-center gap-2 px-4 py-2 ${tw.bgTealSolid} text-sm font-semibold rounded-lg transition-colors`}
        >
          <Download size={14} /> Télécharger le QR
        </button>
      </div>
    </div>
  </div>
);
