---
title: Experience / CV
layout: default
nav_key: experience
world_mode: experience
description: Gavin Lip's research experience, education, methods, skills, publication, and interests.
---
{% assign profile = site.data.profile %}
{% capture cv_intro %}Research experience across multimodal modelling, archival AI, computational history, and language-model evaluation.{% endcapture %}
{% include page-hero.html mode="experience" index="FIELD 06" label="Experience / CV" kicker="A working record · 2023—2026" intro=cv_intro %}

<section class="cv-intro section-rule" data-world-mode="experience">
  <div class="shell cv-intro__grid">
    <div class="section-index"><span>01</span><span>Profile</span></div>
    <div>
      <p class="cv-intro__lead">{{ profile.bio }}</p>
      <div class="cv-intro__contact">
        <a href="mailto:{{ profile.contact.email }}">{{ profile.contact.email }}</a>
        <span>{{ profile.contact.location }}</span>
        {% include social-links.html social=profile.contact.social %}
      </div>
    </div>
    <div>
      <a class="button button--dark" href="{{ profile.cv.download_url | relative_url }}" download>{{ profile.cv.download_label }} ↓</a>
      <p class="privacy-note">The downloadable original contains the contact information supplied in the source CV.</p>
    </div>
  </div>
</section>

<section class="cv-section section-rule" data-world-mode="experience">
  <div class="shell">
    <div class="cv-section__heading"><span>02</span><h2>Research experience</h2></div>
    <div class="cv-timeline">
      {% for item in profile.experience %}
        <article class="cv-entry reveal">
          <p class="cv-entry__date">{{ item.dates }}</p>
          <div class="cv-entry__main">
            <h3>{{ item.role }}</h3>
            <p class="cv-entry__institution">{{ item.institution }}</p>
            <p>{{ item.summary }}</p>
          </div>
          <ul class="tag-list cv-entry__tags">
            {% for method in item.methods %}<li>{{ method }}</li>{% endfor %}
          </ul>
        </article>
      {% endfor %}
    </div>
  </div>
</section>

<section class="cv-section cv-section--paper section-rule" data-world-mode="experience">
  <div class="shell">
    <div class="cv-section__heading"><span>03</span><h2>Education</h2></div>
    <div class="education-grid">
      {% for item in profile.education %}
        <article class="education-card reveal">
          <p class="card-meta"><span>{{ item.dates }}</span><span>{{ item.institution }}</span></p>
          <h3>{{ item.degree }}</h3>
          <dl>
            <div><dt>Thesis</dt><dd>{{ item.thesis }}</dd></div>
            {% if item.detail %}<div><dt>Record</dt><dd>{{ item.detail }}</dd></div>{% endif %}
            <div><dt>Selected coursework</dt><dd>{{ item.coursework | join: " · " }}</dd></div>
          </dl>
        </article>
      {% endfor %}
    </div>
  </div>
</section>

{% assign publication = site.publications | first %}
<section class="cv-section section-rule" data-world-mode="publications">
  <div class="shell">
    <div class="cv-section__heading"><span>04</span><h2>Selected publication</h2></div>
    {% include publication-card.html publication=publication %}
  </div>
</section>

<section class="cv-section cv-section--skills section-rule" data-world-mode="experience">
  <div class="shell">
    <div class="cv-section__heading"><span>05</span><h2>Methods & skills</h2></div>
    <div class="skill-grid">
      {% for group in profile.skills %}
        <article class="skill-card reveal">
          <h3>{{ group.title }}</h3>
          <ul>{% for item in group.items %}<li>{{ item }}</li>{% endfor %}</ul>
        </article>
      {% endfor %}
    </div>
  </div>
</section>

<section class="cv-interests" data-world-mode="media">
  <div class="shell cv-interests__grid">
    <div>
      <p class="kicker">Outside the formal record</p>
      <h2>Interests keep the method porous.</h2>
    </div>
    <ol>
      {% for item in profile.interests %}
        <li><span>0{{ forloop.index }}</span>{{ item }}</li>
      {% endfor %}
    </ol>
  </div>
</section>
