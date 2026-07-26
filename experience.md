---
title: Experience
layout: default
nav_key: experience
description: A working record of research, projects, education, and roles.
---
<header class="page-hero page-hero--editorial">
  <canvas class="page-hero__field" data-mini-flock aria-hidden="true"></canvas>
  <div class="shell page-hero__content reveal">
    <p class="section__eyebrow">A working record</p>
    <h1>Experience</h1>
    <p>Research, building, and learning are presented together here because each continually changes how I approach the others.</p>
  </div>
</header>

<section class="section timeline-section">
  <div class="shell">
    <div class="timeline-section__heading">
      <p class="section__eyebrow">Current roles</p>
      <h2>Work &amp; practice</h2>
    </div>
    <div class="timeline">
      <article class="timeline__entry">
        <div class="timeline__when">Current</div>
        <div class="timeline__what">
          <h3>Research Assistant · Cybernetics &amp; Artificial Societies</h3>
          <p>Contributing to research on cybernetic theory and computational societies, with a focus on how artificial agents coordinate, adapt, and produce system-level behaviour.</p>
        </div>
        <div class="timeline__type">Research</div>
      </article>
      <article class="timeline__entry">
        <div class="timeline__when">Current</div>
        <div class="timeline__what">
          <h3>Co-founder · Story Machines</h3>
          <p>Building local AI tools for institutional digital ecosystems, with an emphasis on contextual knowledge, privacy, and durable institutional memory.</p>
        </div>
        <div class="timeline__type">Venture</div>
      </article>
    </div>
  </div>
</section>

{% assign education = site.data.profile.education %}
{% if education and education.size > 0 %}
  <section class="section timeline-section timeline-section--paper">
    <div class="shell">
      <div class="timeline-section__heading">
        <p class="section__eyebrow">Education</p>
        <h2>Formation</h2>
      </div>
      <div class="timeline">
        {% for item in education %}
          <article class="timeline__entry">
            <div class="timeline__when">{{ item.dates }}</div>
            <div class="timeline__what">
              <h3>{{ item.degree }}</h3>
              {% if item.detail and item.detail != "" %}<p>{{ item.detail }}</p>{% endif %}
            </div>
            <div class="timeline__type">{{ item.institution }}</div>
          </article>
        {% endfor %}
      </div>
    </div>
  </section>
{% endif %}

{% if site.data.profile.cv.download_url and site.data.profile.cv.download_url != "" %}
  <section class="section cv-band" id="cv">
    <div class="shell cv-band__inner">
      <h2>The concise version,<br>for the formal record.</h2>
      <a class="button button--light" href="{{ site.data.profile.cv.download_url | relative_url }}" download>{{ site.data.profile.cv.download_label }} ↓</a>
    </div>
  </section>
{% endif %}
