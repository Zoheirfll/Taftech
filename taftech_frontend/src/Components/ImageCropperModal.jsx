import React, { useState, useCallback, useEffect } from "react";
import Cropper from "react-easy-crop";
import { X, ZoomIn, Check } from "lucide-react";
import { tw } from "../theme";

// Découpe la zone sélectionnée (en pixels réels de l'image source) via un <canvas>, puis
// renvoie un File du même type que l'original — prêt à être uploadé comme n'importe quel
// fichier choisi normalement par l'utilisateur (aucun changement côté backend nécessaire).
const decouperImage = (imageSrc, zoneRecadree, fileName, fileType) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.src = imageSrc;
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = zoneRecadree.width;
      canvas.height = zoneRecadree.height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(
        image,
        zoneRecadree.x,
        zoneRecadree.y,
        zoneRecadree.width,
        zoneRecadree.height,
        0,
        0,
        zoneRecadree.width,
        zoneRecadree.height,
      );
      canvas.toBlob((blob) => {
        if (!blob) return reject(new Error("Échec du recadrage."));
        resolve(new File([blob], fileName, { type: fileType }));
      }, fileType);
    };
    image.onerror = reject;
  });

/**
 * Modale de recadrage affichée juste après la sélection d'un fichier image, avant l'upload.
 * `aspect` fixe le ratio du cadre (1 = carré pour logo/photo profil, 16/9 ou 21/9 pour une
 * bannière large...) — chaque emplacement d'upload garde son propre ratio, l'utilisateur ajuste
 * juste le zoom/la position à l'intérieur de ce cadre.
 */
const ImageCropperModal = ({ file, aspect, cropShape = "rect", onCancel, onValidate }) => {
  const [imageSrc, setImageSrc] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [zoneRecadree, setZoneRecadree] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setImageSrc(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const onCropComplete = useCallback((_, zoneEnPixels) => {
    setZoneRecadree(zoneEnPixels);
  }, []);

  const handleValider = async () => {
    if (!zoneRecadree) return;
    setSaving(true);
    try {
      const fichierRecadre = await decouperImage(imageSrc, zoneRecadree, file.name, file.type);
      onValidate(fichierRecadre);
    } catch {
      setSaving(false);
    }
  };

  if (!imageSrc) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h3 className="text-base font-bold text-slate-900">Ajuster la photo</h3>
          <button onClick={onCancel} className="p-1.5 text-slate-600 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="relative w-full h-80 bg-slate-900">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={aspect}
            cropShape={cropShape}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
          />
        </div>

        <div className="px-5 py-4 space-y-4">
          <div className="flex items-center gap-3">
            <ZoomIn size={16} className="text-slate-600 shrink-0" />
            <input
              type="range"
              min={1}
              max={3}
              step={0.05}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="w-full accent-indigo-600"
            />
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 py-2.5 bg-slate-100 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-200 transition-colors"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={handleValider}
              disabled={saving}
              className={`flex-1 py-2.5 ${tw.bgPrimarySolidHover} text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2`}
            >
              <Check size={15} /> {saving ? "Recadrage..." : "Valider"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageCropperModal;
