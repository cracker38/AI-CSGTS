package com.aicsgts.api;

import com.aicsgts.repo.DepartmentRepository;
import com.aicsgts.repo.JobRoleRepository;
import com.aicsgts.repo.SkillRepository;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/public")
public class PublicController {

  private final DepartmentRepository departments;
  private final JobRoleRepository jobRoles;
  private final SkillRepository skills;

  public PublicController(DepartmentRepository departments, JobRoleRepository jobRoles, SkillRepository skills) {
    this.departments = departments;
    this.jobRoles = jobRoles;
    this.skills = skills;
  }

  @GetMapping("/registration-options")
  @Transactional(readOnly = true)
  public Map<String, Object> registrationOptions() {
    return Map.of(
        "departments", departments.findAll().stream().map(d -> Map.of(
            "id", d.getId(),
            "name", d.getName()
        )).toList(),
        "jobRoles", jobRoles.findAll().stream().map(r -> Map.of(
            "id", r.getId(),
            "name", r.getName()
        )).toList(),
        "skills", skills.findAll().stream().map(s -> Map.of(
            "id", s.getId(),
            "name", s.getName(),
            "category", s.getCategory() == null ? "" : s.getCategory()
        )).toList(),
        "selfServiceRoles", List.of(
            Map.of(
                "id", "EMPLOYEE",
                "label", "Employee",
                "summary", "Only employee self-registration is public. Manager and HR accounts are created in the Admin dashboard."
            )
        )
    );
  }
}

