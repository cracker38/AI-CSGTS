package com.aicsgts.service;

import com.aicsgts.domain.AppUser;
import com.aicsgts.domain.Role;
import com.aicsgts.repo.AppUserRepository;
import org.apache.poi.xslf.usermodel.XMLSlideShow;
import org.apache.poi.xslf.usermodel.XSLFSlide;
import org.apache.poi.xslf.usermodel.XSLFTextBox;
import org.apache.poi.xslf.usermodel.XSLFTextParagraph;
import org.apache.poi.xslf.usermodel.XSLFTextRun;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.time.Instant;
import java.util.List;

/** One-slide executive summary PPTX (Apache POI). */
@Service
public class SkillHealthPptService {

  private final AppUserRepository users;
  private final SkillGapService skillGapService;

  public SkillHealthPptService(AppUserRepository users, SkillGapService skillGapService) {
    this.users = users;
    this.skillGapService = skillGapService;
  }

  @Transactional(readOnly = true)
  public byte[] buildOrgSkillHealthDeck() throws Exception {
    List<AppUser> emps = users.findByRoleOrderByNameAsc(Role.EMPLOYEE);
    int n = 0;
    double sum = 0;
    int atRisk = 0;
    for (AppUser e : emps) {
      if (!e.isActive() || e.getJobRole() == null) continue;
      var g = skillGapService.computeForEmployee(e);
      int t = g.greenCount() + g.yellowCount() + g.orangeCount() + g.redCount();
      if (t == 0) continue;
      if (g.redCount() > 0) atRisk++;
      sum += (100.0 * g.greenCount()) / t;
      n++;
    }
    int readiness = n == 0 ? 0 : (int) Math.round(sum / n);

    try (XMLSlideShow ppt = new XMLSlideShow()) {
      ppt.setPageSize(new java.awt.Dimension(9144000, 6858000));
      XSLFSlide slide = ppt.createSlide();
      XSLFTextBox box = slide.createTextBox();
      box.setAnchor(new java.awt.Rectangle(360000, 360000, 8280000, 6000000));
      XSLFTextParagraph p0 = box.addNewTextParagraph();
      XSLFTextRun r0 = p0.addNewTextRun();
      r0.setText("AI-CSGTS — Organizational skill health");
      r0.setFontSize(28d);
      r0.setBold(true);

      XSLFTextParagraph p1 = box.addNewTextParagraph();
      XSLFTextRun r1 = p1.addNewTextRun();
      r1.setFontSize(16d);
      r1.setText("Generated: " + Instant.now() + "\n"
          + "Active employees in sample: " + emps.stream().filter(AppUser::isActive).count() + "\n"
          + "Avg readiness (green / required skills): " + readiness + "%\n"
          + "Employees with any critical (red) gap: " + atRisk + "\n\n"
          + "MVP deck — connect to BI / scheduled email in production.");

      ByteArrayOutputStream bos = new ByteArrayOutputStream();
      ppt.write(bos);
      return bos.toByteArray();
    }
  }
}
