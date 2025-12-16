import { Button } from '@/components/ui/button'

type Props = {
    onAgree: () => void
}

export function IntroCard({ onAgree }: Props) {
    return (
        <div className="rounded-2xl border border-slate-700/50 bg-slate-900/60 p-6 text-sm text-slate-300 space-y-4">
            <p className="font-medium text-slate-100">Dear participant,</p>

            <p>Please fill in the following form to register for the hackathon.</p>

            {/* FULL intro (no toggle) */}
            <p>
                The questions address your motivations to participate, your skillset, team, and idea. We will use this
                data to know how many participants are motivated by entrepreneurship and how many have startup ideas
                and help them form teams with other participants who are also motivated by entrepreneurship.
            </p>
            <p>
                The form also has questions regarding basic demographic information (age, gender, nationality, meal
                preference, current employment and education) to ensure there are enough resources for all
                participants involved.
            </p>
            <p>
                Finally, we ask for your name and email to contact you regarding updates about your registration, the
                event, and potential team members who have similar motivations as you. If you already have a team, we
                ask the team leader for your names so we can know which team everyone belongs to.
            </p>
            <p>
                We will store this data in a safe and confidential environment for up to 5 years after the hackathon
                ends. You are always welcome to contact us to modify it or erase it. Please remember that
                participation in the hackathon is voluntary and that you have the right to withdraw at any time. You
                are free to decline to answer any particular question you do not wish to answer for any reason. This
                hackathon is an inclusive and safe event. All communication during the hackathon should be
                respectful. We do not tolerate harassment of hackathon participants in any form. Participants
                violating these rules may be sanctioned or expelled from the hackathon.
            </p>

            <div className="pt-2">
                <Button type="button" onClick={onAgree} className="w-full sm:w-auto">
                    Next
                </Button>
            </div>
        </div>
    )
}
