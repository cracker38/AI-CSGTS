package com.aicsgts.repo;

import com.aicsgts.domain.ManagerSkillAssessment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ManagerSkillAssessmentRepository extends JpaRepository<ManagerSkillAssessment, Long> {
  List<ManagerSkillAssessment> findByEmployee_IdOrderByCreatedAtDesc(Long employeeId);

  List<ManagerSkillAssessment> findByManager_IdAndEmployee_IdOrderByCreatedAtDesc(Long managerId, Long employeeId);
}
