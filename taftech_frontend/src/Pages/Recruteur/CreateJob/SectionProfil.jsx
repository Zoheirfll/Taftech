// Section "Profil recherché" : expérience requise, puis blocs formation requise et exigences impératives.
import Select from "react-select";
import { GraduationCap } from "lucide-react";
import { selectStylesTeal } from "../../../theme";
import { Section, Field } from "./formUi";
import BlocFormationRequise from "./BlocFormationRequise";
import BlocExigences from "./BlocExigences";

const SectionProfil = ({ job }) => {
  const { constants, formData, handleSelectChange } = job;
  return (
    <Section icon={GraduationCap} title="Profil recherché">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Expérience requise">
          <Select
            name="experience_requise"
            options={constants.experiences}
            onChange={handleSelectChange}
            value={constants.experiences.find((e) => e.value === formData.experience_requise) || null}
            placeholder="Sélectionner..."
            styles={selectStylesTeal}
          />
        </Field>
      </div>
      <BlocFormationRequise job={job} />
      <BlocExigences job={job} />
    </Section>
  );
};

export default SectionProfil;
