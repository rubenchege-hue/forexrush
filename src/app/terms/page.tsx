'use client';

import Link from 'next/link';
import { Zap, ArrowLeft } from 'lucide-react';

export default function TermsPage() {
  return (
    <div className="min-h-screen" style={{ background: '#07070c', color: '#ededf4', fontFamily: "'Space Grotesk', sans-serif" }}>
      {/* Nav */}
      <nav className="flex items-center gap-2 px-4 h-12 border-b" style={{ background: '#0d0d14', borderColor: '#282840' }}>
        <div className="h-7 w-7 rounded-lg flex items-center justify-center" style={{ background: '#c8f542' }}>
          <Zap size={12} style={{ color: '#07070c' }} />
        </div>
        <span className="text-sm font-bold tracking-tight">ForexRush</span>
        <Link href="/" className="ml-auto flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-semibold" style={{ background: '#1a1a28', color: '#8585a0' }}>
          <ArrowLeft size={12} /> Back
        </Link>
      </nav>

      <div className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-extrabold mb-1">ForexRush — Official Rules & Terms of Participation</h1>
        <p className="text-xs mb-8" style={{ color: '#505068' }}>Last updated: July 2026</p>

        <p className="text-sm mb-8 leading-relaxed" style={{ color: '#8585a0' }}>
          Please read these rules in full before entering. By paying the entry fee and/or registering an account, you confirm you have read, understood, and agree to be bound by these Terms.
        </p>

        <div className="space-y-8 text-sm leading-relaxed" style={{ color: '#c5c5d0' }}>
          <Section num="1" title="What This Competition Is">
            <p><strong>1.1</strong> ForexRush ("the Competition," "we," "us") is a <strong>skill-based trading simulation contest</strong>. Participants compete using <strong>demo/virtual trading accounts only</strong>. No real money is traded, deposited into, or withdrawn from any brokerage account as part of participating in the Competition.</p>
            <p><strong>1.2</strong> The entry fee paid by participants is solely an <strong>administration and prize-pool contribution fee</strong> for entry into the contest. It is not an investment, deposit, or trading capital, and is not placed into any live market position on behalf of the participant or the organizer.</p>
            <p><strong>1.3</strong> This Competition is a test of trading knowledge, strategy, and decision-making skill. Rankings are determined by performance against fixed, disclosed scoring criteria (see Section 4), not by chance. ForexRush is not a lottery, raffle, or game of chance.</p>
            <p><strong>1.4</strong> ForexRush is not a licensed forex broker, dealer, investment advisor, or fund manager, and does not provide investment advice. We do not hold, manage, or have access to any participant's real trading funds.</p>
          </Section>

          <Section num="2" title="Eligibility">
            <p><strong>2.1</strong> Participants must be at least 18 years old.</p>
            <p><strong>2.2</strong> Participants must reside in a jurisdiction where entry into a skill-based, paid-entry contest of this kind is lawful. It is the participant's responsibility to confirm this before entering.</p>
            <p><strong>2.3</strong> ForexRush staff, contractors, and immediate family members of staff are not eligible to win prizes, though they may participate for testing purposes.</p>
            <p><strong>2.4</strong> We reserve the right to verify identity (name, phone number, and/or ID) before prize payout, and to disqualify entries that fail verification.</p>
          </Section>

          <Section num="3" title="Entry Fees & Refunds">
            <p><strong>3.1</strong> The entry fee for each round is stated at the time of registration and is payable via the provided payment method.</p>
            <p><strong>3.2</strong> Entry fees are <strong>non-refundable</strong> once a competition round has started, except:</p>
            <ul style={{ color: '#8585a0', paddingLeft: '1.5rem', marginTop: '0.25rem' }}>
              <li>If ForexRush cancels or postpones the round before it starts, in which case fees will be refunded in full within 7 business days.</li>
              <li>If a technical failure on our platform (not the participant's device or connection) prevents the participant from trading for a material portion of the round, at our sole discretion.</li>
            </ul>
            <p><strong>3.3</strong> ForexRush does not guarantee any return on the entry fee other than the possibility of winning a prize as described in these rules.</p>
          </Section>

          <Section num="4" title="How the Competition Works">
            <p><strong>4.1</strong> Each participant is issued a demo trading account pre-loaded with virtual starting capital of <strong>$10,000</strong>.</p>
            <p><strong>4.2</strong> The competition round runs from the start time to the end time stated at registration.</p>
            <p><strong>4.3</strong> Rankings are determined by percentage return on virtual starting capital, subject to the risk limits in 4.4.</p>
            <p><strong>4.4</strong> To prevent single high-risk trades from unfairly deciding rankings, the following risk limits apply:</p>
            <ul style={{ color: '#8585a0', paddingLeft: '1.5rem', marginTop: '0.25rem' }}>
              <li>Maximum risk per trade: 20% of account equity</li>
              <li>Maximum daily drawdown: 30%</li>
              <li>Minimum of 5 trades required to qualify for prizes</li>
              <li>No hedging the same pair in opposite directions simultaneously</li>
            </ul>
            <p>Violation of these limits may result in disqualification from prize eligibility, at our discretion.</p>
            <p><strong>4.5</strong> A live leaderboard will be available on the platform and updated regularly so participants can track standings throughout the round.</p>
            <p><strong>4.6</strong> In the event of a tie, the participant with the lowest maximum drawdown wins. If still tied, the participant who reached their final score first wins.</p>
          </Section>

          <Section num="5" title="Prizes">
            <p><strong>5.1</strong> The prize for each round is stated on the competition page at the time of registration.</p>
            <p><strong>5.2</strong> The prize is funded by ForexRush directly from entry fee collections.</p>
            <p><strong>5.3</strong> Prizes must be claimed within 30 days of results being announced. Unclaimed prizes after this period may be forfeited.</p>
            <p><strong>5.4</strong> Winners may be asked to complete identity verification and, where applicable, provide tax information before prize payout, in compliance with applicable law.</p>
            <p><strong>5.5</strong> ForexRush reserves the right to withhold or reallocate a prize if there is credible evidence of cheating, multiple-account use, or rule violations.</p>
          </Section>

          <Section num="6" title="Fair Play">
            <p><strong>6.1</strong> Each participant may register only <strong>one</strong> account per round. Multiple accounts by the same individual will result in disqualification of all associated entries.</p>
            <p><strong>6.2</strong> Any form of exploiting platform bugs, colluding with other participants to manipulate rankings, or using unauthorized automated trading tools not permitted under the round's rules is prohibited and grounds for disqualification.</p>
            <p><strong>6.3</strong> ForexRush reserves the right to review any account's trading activity and disqualify entries that violate these rules, with or without prior notice.</p>
          </Section>

          <Section num="7" title="Risk & No Financial Advice Disclaimer">
            <p><strong>7.1</strong> This Competition is for educational and entertainment purposes. Nothing on this platform, including leaderboard performance, educational content, or communications from ForexRush, constitutes financial, investment, or trading advice.</p>
            <p><strong>7.2</strong> Performance in a demo/simulated trading environment does not guarantee or indicate future performance in live markets. Live trading involves risk of financial loss.</p>
            <p><strong>7.3</strong> Participants acknowledge that any trading activity involves risk and that ForexRush bears no responsibility for trading decisions made by participants during or after the competition.</p>
          </Section>

          <Section num="8" title="Data & Privacy">
            <p><strong>8.1</strong> We collect participant name, contact details, and payment information solely to operate the Competition, communicate results, and process prizes.</p>
            <p><strong>8.2</strong> We do not sell participant data to third parties.</p>
            <p><strong>8.3</strong> By participating, you consent to the display of your chosen username and competition statistics (P&amp;L, win rate, number of trades) on the public leaderboard.</p>
          </Section>

          <Section num="9" title="Limitation of Liability">
            <p><strong>9.1</strong> ForexRush is provided "as is." We do not guarantee uninterrupted platform availability and are not liable for losses arising from technical outages, internet connectivity issues, or third-party platform failures beyond our reasonable control.</p>
            <p><strong>9.2</strong> To the maximum extent permitted by law, ForexRush's total liability to any participant is limited to the entry fee paid by that participant.</p>
          </Section>

          <Section num="10" title="Changes to Rules">
            <p><strong>10.1</strong> We may update these rules between rounds. Any changes will be posted on this page with an updated "Last updated" date and will apply to rounds starting after the change.</p>
            <p><strong>10.2</strong> Rules for a round already in progress will not be changed to a participant's disadvantage.</p>
          </Section>

          <Section num="11" title="Governing Law & Disputes">
            <p><strong>11.1</strong> These Terms are governed by the laws of the Republic of Kenya.</p>
            <p><strong>11.2</strong> Any disputes arising from participation in the Competition should first be raised with us at <a href="mailto:support@forexrush.com" style={{ color: '#c8f542' }}>support@forexrush.com</a> for resolution.</p>
          </Section>

          <Section num="12" title="Contact">
            <p>Questions about these rules or the Competition can be directed to:</p>
            <p style={{ color: '#8585a0' }}>
              Email: <a href="mailto:support@forexrush.com" style={{ color: '#c8f542' }}>support@forexrush.com</a><br />
              Phone / WhatsApp: [Insert phone number]
            </p>
          </Section>
        </div>

        <div className="mt-10 p-4 rounded-lg border text-xs leading-relaxed" style={{ background: '#0d0d14', borderColor: '#282840', color: '#505068' }}>
          <strong>Disclaimer:</strong> This document is a template and has not been reviewed by a lawyer. ForexRush recommends all participants read these rules carefully, and the organizer is strongly advised to have this document reviewed by a Kenyan advocate familiar with the Capital Markets Act and the Betting, Lotteries and Gaming Act before publishing it live.
        </div>
      </div>
    </div>
  );
}

function Section({ num, title, children }: { num: string; title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-base font-bold mb-2" style={{ color: '#c8f542' }}>{num}. {title}</h2>
      <div className="space-y-2" style={{ color: '#b0b0c0' }}>
        {children}
      </div>
    </section>
  );
}
