import { preflight, result, withUser } from "@/lib/api";
import { applyAsPartner, type Application } from "@/lib/partner-work";
import { uploadedFile } from "@/lib/uploads";

export const OPTIONS = preflight;

/**
 * A professional's application, sent as multipart form data with the same fields as the website
 * form: name, cityId, skills (repeated), experienceYears, idProofType, idProofLast4, bio, idDoc, photo.
 */
export async function POST(request: Request) {
  return withUser(request, async (user) => {
    const form = await request.formData();
    const r = await applyAsPartner(user, {
      name: String(form.get("name") ?? ""),
      cityId: String(form.get("cityId") ?? ""),
      skills: form.getAll("skills").map(String),
      experienceYears: String(form.get("experienceYears") ?? ""),
      idProofType: String(form.get("idProofType") ?? "") as Application["idProofType"],
      idProofLast4: String(form.get("idProofLast4") ?? ""),
      bio: String(form.get("bio") ?? "") || undefined,
      idDoc: uploadedFile(form.get("idDoc")),
      photo: uploadedFile(form.get("photo")),
    });
    return result(r);
  });
}
