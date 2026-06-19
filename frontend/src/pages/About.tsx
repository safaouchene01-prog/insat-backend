import { motion } from 'framer-motion';
import { Shield, Heart, Users, Award, Target, Globe } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function AboutPage() {
  const { t } = useTranslation();

  const values = [
    { icon: Heart, title: t('about.v1Title'), desc: t('about.v1Desc') },
    { icon: Shield, title: t('about.v2Title'), desc: t('about.v2Desc') },
    { icon: Users, title: t('about.v3Title'), desc: t('about.v3Desc') },
    { icon: Award, title: t('about.v4Title'), desc: t('about.v4Desc') },
    { icon: Target, title: t('about.v5Title'), desc: t('about.v5Desc') },
    { icon: Globe, title: t('about.v6Title'), desc: t('about.v6Desc') },
  ];

  return (
    <div className="min-h-screen">
      {/* HERO */}
      <section className="relative py-16 bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_white_1px,_transparent_1px)] bg-[size:24px_24px]" />

        <div className="container mx-auto px-6 text-center relative z-10 max-w-5xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 leading-tight">
              {t('about.title1')}
              <br />
              <span className="text-[var(--color-primary)]">
                {t('about.title2')}
              </span>
            </h1>

            <p className="text-white/80 text-lg max-w-2xl mx-auto">
              {t('about.heroDesc')}
            </p>
          </motion.div>
        </div>
      </section>

      {/* MISSION */}
      <section className="py-14 bg-[var(--color-muted)]">
        <div className="container mx-auto px-6 max-w-6xl">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <span className="text-[var(--color-primary)] text-sm font-semibold tracking-widest uppercase mb-3 block">
                {t('about.missionLabel')}
              </span>

              <h2 className="text-3xl font-bold text-[var(--color-dark)] mb-4">
                {t('about.missionTitle')}
              </h2>

              <p className="text-[var(--color-dark)] opacity-80 leading-relaxed mb-3">
                {t('about.missionDesc1')}
              </p>

              <p className="text-[var(--color-dark)] opacity-80 leading-relaxed">
                {t('about.missionDesc2')}
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="grid grid-cols-2 gap-4"
            >
              {[
                { num: '500+', label: t('about.stat1') },
                { num: '50k+', label: t('about.stat2') },
                { num: '69', label: t('about.stat3') },
                { num: '4.9★', label: t('about.stat4') },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="bg-[var(--color-surface)] rounded-2xl p-5 text-center border border-[var(--color-border)] shadow-sm"
                >
                  <p className="text-3xl font-bold text-[var(--color-primary)] mb-1">
                    {stat.num}
                  </p>
                  <p className="text-sm text-[var(--color-dark)] opacity-70">
                    {stat.label}
                  </p>
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* VALUES */}
      <section className="py-14 bg-[var(--color-surface)]">
        <div className="container mx-auto px-6 max-w-6xl">
          <div className="text-center mb-10">
            <span className="text-[var(--color-primary)] text-sm font-semibold tracking-widest uppercase mb-2 block">
              {t('about.valuesLabel')}
            </span>

            <h2 className="text-3xl font-bold text-[var(--color-dark)]">
              {t('about.valuesTitle')}
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {values.map((v, i) => (
              <motion.div
                key={v.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-[var(--color-muted)] rounded-2xl p-6 border border-[var(--color-border)] hover:border-[var(--color-primary)]/40 transition-all hover:shadow-md group"
              >
                <div className="w-12 h-12 rounded-xl bg-[var(--color-primary)]/10 flex items-center justify-center mb-4 group-hover:bg-[var(--color-primary)]/20 transition-colors">
                  <v.icon className="w-6 h-6 text-[var(--color-primary)]" />
                </div>

                <h3 className="text-lg font-semibold text-[var(--color-dark)] mb-2">
                  {v.title}
                </h3>

                <p className="text-sm text-[var(--color-dark)] opacity-70 leading-relaxed">
                  {v.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}